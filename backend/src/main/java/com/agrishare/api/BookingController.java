package com.agrishare.api;

import com.agrishare.domain.*;
import com.agrishare.repository.*;
import com.agrishare.service.NotificationService;
import com.agrishare.service.RazorpayService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingRepository bookings;
    private final UserRepository users;
    private final ProviderRepository providers;
    private final EquipmentRepository equipment;
    private final LabourGroupRepository labourGroups;
    private final NotificationService notifications;
    private final RazorpayService razorpay;

    public BookingController(BookingRepository bookings, UserRepository users,
                             ProviderRepository providers, EquipmentRepository equipment,
                             LabourGroupRepository labourGroups, NotificationService notifications,
                             RazorpayService razorpay) {
        this.bookings = bookings;
        this.users = users;
        this.providers = providers;
        this.equipment = equipment;
        this.labourGroups = labourGroups;
        this.notifications = notifications;
        this.razorpay = razorpay;
    }

    @PostMapping
    @Transactional
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse create(Authentication authentication,
                                  @Valid @RequestBody CreateBookingRequest request) {
        User farmer = users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Provider provider = providers.findById(request.providerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Provider not found"));
        Equipment listing = request.equipmentId() == null ? null : equipment.findById(request.equipmentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipment not found"));
        LabourGroup labourGroup = request.labourGroupId() == null ? null : labourGroups.findById(request.labourGroupId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Labour group not found"));
        if ((listing == null) == (labourGroup == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose exactly one resource");
        }
        if ((listing != null && !listing.getProvider().equals(provider))
                || (labourGroup != null && !labourGroup.getProvider().equals(provider))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Equipment does not belong to provider");
        }
        if (request.endDate().isBefore(request.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date must not precede start date");
        }
        List<BookingStatus> activeStatuses = List.of(BookingStatus.PENDING, BookingStatus.ACCEPTED);
        boolean overlap = listing != null
                ? bookings.existsByEquipmentIdAndStatusInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    listing.getId(), activeStatuses, request.endDate(), request.startDate())
                : bookings.existsByLabourGroupIdAndStatusInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    labourGroup.getId(), activeStatuses, request.endDate(), request.startDate());
        if (overlap) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This equipment is already booked for these dates");
        }
        BigDecimal dailyPrice = listing != null ? listing.getPricePerDay() : labourGroup.getPricePerDay();
        long bookingDays = ChronoUnit.DAYS.between(request.startDate(), request.endDate()) + 1;
        BigDecimal totalPrice = dailyPrice.multiply(BigDecimal.valueOf(bookingDays));
        Booking saved = bookings.save(new Booking(farmer, provider, listing, labourGroup,
                request.startDate(), request.endDate(), totalPrice));
        notifications.send(provider.getUser(), "BOOKING_CREATED",
                "New booking request received for " + request.startDate() + " to " + request.endDate() + ".");
        return new BookingResponse(saved.getId(), saved.getStatus().name(),
                saved.getStartDate(), saved.getEndDate(), saved.getTotalPrice(),
                saved.getPaymentStatus().name());
    }

    @GetMapping("/my")
    public List<BookingResponse> mine(Authentication authentication) {
        return bookings.findByFarmerEmailIgnoreCaseOrderByCreatedAtDesc(authentication.getName())
                .stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public BookingResponse get(Authentication authentication, @PathVariable Long id) {
        Booking booking = bookings.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (!booking.getFarmer().getEmail().equalsIgnoreCase(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return toResponse(booking);
    }

    @GetMapping("/{id}/invoice")
    public InvoiceResponse invoice(Authentication authentication, @PathVariable Long id) {
        Booking booking = bookings.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        boolean farmer = booking.getFarmer().getEmail().equalsIgnoreCase(authentication.getName());
        boolean provider = booking.getProvider().getUser().getEmail().equalsIgnoreCase(authentication.getName());
        if (!farmer && !provider) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        BigDecimal dailyRate = booking.getEquipment() != null
                ? booking.getEquipment().getPricePerDay() : booking.getLabourGroup().getPricePerDay();
        String resourceName = booking.getEquipment() != null
                ? booking.getEquipment().getEquipmentName() : booking.getLabourGroup().getGroupName();
        return new InvoiceResponse("AGR-" + booking.getId(), booking.getId(),
                booking.getStatus().name(), booking.getPaymentStatus().name(),
                booking.getFarmer().getName(), booking.getFarmer().getEmail(),
                booking.getProvider().getBusinessName(), booking.getProvider().getUser().getEmail(),
                resourceName, booking.getStartDate(), booking.getEndDate(), dailyRate,
                booking.getTotalPrice());
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancel(Authentication authentication, @PathVariable Long id) {
        Booking booking = bookings.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (!booking.getFarmer().getEmail().equalsIgnoreCase(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (booking.getStatus() == BookingStatus.COMPLETED
                || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking cannot be cancelled");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        if (booking.getPaymentStatus() == PaymentStatus.PAID) {
            booking.setPaymentStatus(PaymentStatus.REFUNDED);
        }
        notifications.send(booking.getProvider().getUser(), "BOOKING_CANCELLED",
                "Booking #" + booking.getId() + " was cancelled by the farmer.");
        return toResponse(bookings.save(booking));
    }

    @PostMapping("/{id}/pay")
    public BookingResponse pay(Authentication authentication, @PathVariable Long id) {
        Booking booking = bookings.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        ensureFarmer(booking, authentication);
        if (booking.getStatus() != BookingStatus.ACCEPTED
                || booking.getStatus() == BookingStatus.CANCELLED
                || booking.getStatus() == BookingStatus.REJECTED
                || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Booking can be paid only after provider confirmation");
        }
        if (booking.getPaymentStatus() == PaymentStatus.REFUNDED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Refunded booking cannot be paid");
        }
        if (booking.getPaymentStatus() == PaymentStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking is already paid");
        }
        booking.setPaymentStatus(PaymentStatus.PAID);
        notifications.send(booking.getProvider().getUser(), "PAYMENT_RECEIVED",
                "Payment received for booking #" + booking.getId() + ".");
        return toResponse(bookings.save(booking));
    }

    @PostMapping("/{id}/payment-order")
    public RazorpayService.Order paymentOrder(Authentication authentication, @PathVariable Long id) {
        Booking booking = bookings.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        ensureFarmer(booking, authentication);
        if (booking.getPaymentStatus() != PaymentStatus.UNPAID
                || booking.getStatus() != BookingStatus.ACCEPTED
                || booking.getStatus() == BookingStatus.CANCELLED
                || booking.getStatus() == BookingStatus.REJECTED
                || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking cannot be paid");
        }
        return razorpay.createOrder(booking.getId(), booking.getTotalPrice());
    }

    @PostMapping("/{id}/payment-verify")
    public BookingResponse verifyPayment(Authentication authentication, @PathVariable Long id,
                                         @RequestBody PaymentVerificationRequest request) {
        Booking booking = bookings.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        ensureFarmer(booking, authentication);
        if (booking.getPaymentStatus() != PaymentStatus.UNPAID
                || booking.getStatus() != BookingStatus.ACCEPTED
                || booking.getStatus() == BookingStatus.CANCELLED
                || booking.getStatus() == BookingStatus.REJECTED
                || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking cannot be paid");
        }
        if (!razorpay.verify(request.orderId(), request.paymentId(), request.signature())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid payment signature");
        }
        booking.setPaymentStatus(PaymentStatus.PAID);
        notifications.send(booking.getProvider().getUser(), "PAYMENT_RECEIVED",
                "Payment received for booking #" + booking.getId() + ".");
        return toResponse(bookings.save(booking));
    }

    private void ensureFarmer(Booking booking, Authentication authentication) {
        if (!booking.getFarmer().getEmail().equalsIgnoreCase(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }

    private BookingResponse toResponse(Booking booking) {
        return new BookingResponse(booking.getId(), booking.getStatus().name(),
                booking.getStartDate(), booking.getEndDate(), booking.getTotalPrice(),
                booking.getPaymentStatus().name());
    }

    public record CreateBookingRequest(
            @Positive Long providerId,
            @Positive Long equipmentId,
            @Positive Long labourGroupId,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            BigDecimal totalPrice) {}

    public record PaymentVerificationRequest(String orderId, String paymentId, String signature) {}

    public record BookingResponse(Long id, String status, LocalDate startDate, LocalDate endDate,
                                  BigDecimal totalPrice, String paymentStatus) {}

    public record InvoiceResponse(String invoiceNumber, Long bookingId, String bookingStatus,
                                  String paymentStatus, String farmerName, String farmerEmail,
                                  String providerName, String providerEmail, String resourceName,
                                  LocalDate startDate, LocalDate endDate, BigDecimal dailyRate,
                                  BigDecimal totalAmount) {}
}
