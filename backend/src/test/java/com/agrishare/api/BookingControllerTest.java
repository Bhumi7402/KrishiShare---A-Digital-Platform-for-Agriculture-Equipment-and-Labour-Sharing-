package com.agrishare.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.agrishare.domain.Booking;
import com.agrishare.domain.BookingStatus;
import com.agrishare.domain.Equipment;
import com.agrishare.domain.Provider;
import com.agrishare.domain.PaymentStatus;
import com.agrishare.domain.User;
import com.agrishare.domain.UserRole;
import com.agrishare.repository.BookingRepository;
import com.agrishare.repository.EquipmentRepository;
import com.agrishare.repository.LabourGroupRepository;
import com.agrishare.repository.ProviderRepository;
import com.agrishare.repository.UserRepository;
import com.agrishare.service.NotificationService;
import com.agrishare.service.RazorpayService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class BookingControllerTest {
    @Mock
    private BookingRepository bookings;
    @Mock
    private UserRepository users;
    @Mock
    private ProviderRepository providers;
    @Mock
    private EquipmentRepository equipment;
    @Mock
    private LabourGroupRepository labourGroups;
    @Mock
    private NotificationService notifications;
    @Mock
    private RazorpayService razorpay;
    @Mock
    private Authentication authentication;
    @InjectMocks
    private BookingController controller;

    private User farmer;
    private Provider provider;
    private Equipment listing;

    @BeforeEach
    void setUp() {
        farmer = new User("Farmer", "farmer@test.local", "encoded", UserRole.FARMER);
        provider = new Provider(
                new User("Provider", "provider@test.local", "encoded", UserRole.PROVIDER),
                "Agri Rentals", "EQUIPMENT");
        listing = new Equipment(provider, "TRACTOR", "Tractor 1",
                new BigDecimal("2500.00"), "AVAILABLE");
        when(authentication.getName()).thenReturn("farmer@test.local");
        lenient().when(users.findByEmailIgnoreCase("farmer@test.local")).thenReturn(Optional.of(farmer));
        lenient().when(providers.findById(10L)).thenReturn(Optional.of(provider));
        lenient().when(equipment.findById(20L)).thenReturn(Optional.of(listing));
    }

    @Test
    void calculatesInclusiveBackendTotalAndIgnoresClientTotal() {
        when(bookings.existsByEquipmentIdAndStatusInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any(), eq(LocalDate.of(2026, 10, 12)), eq(LocalDate.of(2026, 10, 10))))
                .thenReturn(false);
        when(bookings.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BookingController.BookingResponse response = controller.create(authentication,
                new BookingController.CreateBookingRequest(
                        10L, 20L, null,
                        LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 12),
                        BigDecimal.ONE));

        assertEquals(new BigDecimal("7500.00"), response.totalPrice());
        verify(bookings).save(argThat(booking ->
                booking.getTotalPrice().equals(new BigDecimal("7500.00"))));
    }

    @Test
    void rejectsOverlappingActiveBookingWithoutSaving() {
        when(bookings.existsByEquipmentIdAndStatusInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), eq(List.of(BookingStatus.PENDING, BookingStatus.ACCEPTED)),
                eq(LocalDate.of(2026, 10, 12)), eq(LocalDate.of(2026, 10, 10))))
                .thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.create(authentication,
                        new BookingController.CreateBookingRequest(
                                10L, 20L, null,
                                LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 12),
                                null)));

        assertEquals(409, exception.getStatusCode().value());
        verify(bookings, never()).save(any(Booking.class));
    }

    @Test
    void verifiesRazorpayPaymentAndMarksBookingPaid() {
        Booking booking = new Booking(farmer, provider, listing, null,
                LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 12),
                new BigDecimal("7500.00"));
        booking.setStatus(BookingStatus.ACCEPTED);
        when(bookings.findById(30L)).thenReturn(Optional.of(booking));
        when(razorpay.verify("order_123", "pay_456", "signature")).thenReturn(true);
        when(bookings.save(booking)).thenReturn(booking);

        BookingController.BookingResponse response = controller.verifyPayment(authentication, 30L,
                new BookingController.PaymentVerificationRequest("order_123", "pay_456", "signature"));

        assertEquals("PAID", response.paymentStatus());
        assertEquals(PaymentStatus.PAID, booking.getPaymentStatus());
        verify(bookings).save(booking);
        verify(notifications).send(provider.getUser(), "PAYMENT_RECEIVED",
                "Payment received for booking #null.");
    }

    @Test
    void rejectsPaymentVerificationForAlreadyPaidBooking() {
        Booking booking = new Booking(farmer, provider, listing, null,
                LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 12),
                new BigDecimal("7500.00"));
        booking.setPaymentStatus(PaymentStatus.PAID);
        when(bookings.findById(31L)).thenReturn(Optional.of(booking));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.verifyPayment(authentication, 31L,
                        new BookingController.PaymentVerificationRequest("order", "payment", "signature")));

        assertEquals(409, exception.getStatusCode().value());
        verifyNoInteractions(razorpay);
        verify(bookings, never()).save(any(Booking.class));
    }

    @Test
    void mockPaymentMarksBookingPaid() {
        Booking booking = new Booking(farmer, provider, listing, null,
                LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 12),
                new BigDecimal("7500.00"));
        booking.setStatus(BookingStatus.ACCEPTED);
        when(bookings.findById(32L)).thenReturn(Optional.of(booking));
        when(bookings.save(booking)).thenReturn(booking);

        BookingController.BookingResponse response = controller.pay(authentication, 32L);

        assertEquals("PAID", response.paymentStatus());
        verify(bookings).save(booking);
        verify(notifications).send(provider.getUser(), "PAYMENT_RECEIVED",
                "Payment received for booking #null.");
    }

    @Test
    void rejectsMockPaymentBeforeProviderConfirmation() {
        Booking booking = new Booking(farmer, provider, listing, null,
                LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 12),
                new BigDecimal("7500.00"));
        when(bookings.findById(34L)).thenReturn(Optional.of(booking));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.pay(authentication, 34L));

        assertEquals(409, exception.getStatusCode().value());
        verify(bookings, never()).save(any(Booking.class));
        verifyNoInteractions(notifications);
    }

    @Test
    void rejectsMockPaymentWhenBookingIsAlreadyPaid() {
        Booking booking = new Booking(farmer, provider, listing, null,
                LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 12),
                new BigDecimal("7500.00"));
        booking.setPaymentStatus(PaymentStatus.PAID);
        when(bookings.findById(33L)).thenReturn(Optional.of(booking));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.pay(authentication, 33L));

        assertEquals(409, exception.getStatusCode().value());
        verify(bookings, never()).save(any(Booking.class));
        verifyNoInteractions(notifications);
    }
}
