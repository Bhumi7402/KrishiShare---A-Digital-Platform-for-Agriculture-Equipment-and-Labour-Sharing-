package com.agrishare.api;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.agrishare.domain.Booking;
import com.agrishare.domain.BookingStatus;
import com.agrishare.domain.Equipment;
import com.agrishare.domain.PaymentStatus;
import com.agrishare.domain.Provider;
import com.agrishare.domain.User;
import com.agrishare.domain.UserRole;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class ProviderControllerTest {
    @Test
    void allowsOnlyValidBookingLifecycleTransitions() {
        assertDoesNotThrow(() ->
                ProviderController.validateTransition(BookingStatus.PENDING, BookingStatus.ACCEPTED));
        assertDoesNotThrow(() ->
                ProviderController.validateTransition(BookingStatus.PENDING, BookingStatus.REJECTED));
        assertDoesNotThrow(() ->
                ProviderController.validateTransition(BookingStatus.ACCEPTED, BookingStatus.COMPLETED));
    }

    @Test
    void rejectsInvalidBookingLifecycleTransitions() {
        assertThrows(ResponseStatusException.class, () ->
                ProviderController.validateTransition(BookingStatus.PENDING, BookingStatus.COMPLETED));
        assertThrows(ResponseStatusException.class, () ->
                ProviderController.validateTransition(BookingStatus.COMPLETED, BookingStatus.REJECTED));
        assertThrows(ResponseStatusException.class, () ->
                ProviderController.validateTransition(BookingStatus.CANCELLED, BookingStatus.ACCEPTED));
    }

    @Test
    void calculatesNetEarningsFromPaidCompletedBookings() {
        User farmer = new User("Farmer", "farmer@test.local", "encoded", UserRole.FARMER);
        Provider provider = new Provider(
                    new User("Provider", "provider@test.local", "encoded", UserRole.PROVIDER),
                    "Agri Rentals", "EQUIPMENT");
        Equipment equipment = new Equipment(provider, "TRACTOR", "Tractor",
                    new BigDecimal("2500.00"), "AVAILABLE");
        Booking completedPaid = new Booking(farmer, provider, equipment, null,
                    LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 12),
                    new BigDecimal("1000.00"));
        completedPaid.setStatus(BookingStatus.COMPLETED);
        completedPaid.setPaymentStatus(PaymentStatus.PAID);
        Booking completedUnpaid = new Booking(farmer, provider, equipment, null,
                    LocalDate.of(2026, 10, 13), LocalDate.of(2026, 10, 14),
                    new BigDecimal("500.00"));
        completedUnpaid.setStatus(BookingStatus.COMPLETED);

        ProviderController.EarningsResponse result =
                    ProviderController.calculateEarnings(List.of(completedPaid, completedUnpaid));

        assertEquals(new BigDecimal("1000.00"), result.grossAmount());
        assertEquals(new BigDecimal("100.0000"), result.platformCommission());
        assertEquals(new BigDecimal("900.0000"), result.netAmount());
        assertEquals(1, result.completedPaidBookings());
    }
}
