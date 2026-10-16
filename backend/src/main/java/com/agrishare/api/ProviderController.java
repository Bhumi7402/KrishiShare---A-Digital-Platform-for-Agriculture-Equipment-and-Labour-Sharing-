package com.agrishare.api;

import com.agrishare.domain.Booking;
import com.agrishare.domain.BookingStatus;
import com.agrishare.domain.Equipment;
import com.agrishare.domain.Provider;
import com.agrishare.domain.PaymentStatus;
import com.agrishare.domain.User;
import com.agrishare.repository.EquipmentRepository;
import com.agrishare.repository.BookingRepository;
import com.agrishare.repository.ProviderRepository;
import com.agrishare.repository.UserRepository;
import com.agrishare.service.NotificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/providers")
public class ProviderController {
    private static final BigDecimal PLATFORM_COMMISSION_RATE = new BigDecimal("0.10");
    private final ProviderRepository providers;
    private final UserRepository users;
    private final EquipmentRepository equipment;
    private final BookingRepository bookings;
    private final NotificationService notifications;

    public ProviderController(ProviderRepository providers, UserRepository users,
                              EquipmentRepository equipment, BookingRepository bookings,
                               NotificationService notifications) {
        this.providers = providers;
        this.users = users;
        this.equipment = equipment;
        this.bookings = bookings;
        this.notifications = notifications;
    }

    @GetMapping
    public List<ProviderResponse> list() {
        return providers.findAll().stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public ProviderResponse get(@PathVariable Long id) {
        return providers.findById(id).map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Provider not found"));
    }

    @GetMapping("/me/equipment")
    public List<EquipmentResponse> myEquipment(Authentication authentication) {
        Provider provider = currentProvider(authentication);
        return equipment.findByProviderId(provider.getId()).stream().map(item ->
                new EquipmentResponse(item.getId(), item.getEquipmentType(), item.getEquipmentName(),
                        item.getPricePerDay(), item.getAvailabilityStatus(), provider.getId(),
                        provider.getBusinessName(), provider.getRating(), provider.getTrustScore()))
                .toList();
    }

    @GetMapping("/me/bookings")
    public List<BookingResponse> myBookings(Authentication authentication) {
        Provider provider = currentProvider(authentication);
        return bookings.findByProviderIdOrderByCreatedAtDesc(provider.getId()).stream()
                .map(booking -> new BookingResponse(booking.getId(), booking.getStatus().name(),
                        booking.getStartDate(), booking.getEndDate(), booking.getTotalPrice(),
                        booking.getPaymentStatus().name()))
                .toList();
    }

    @GetMapping("/me/earnings")
    public EarningsResponse myEarnings(Authentication authentication) {
        Provider provider = currentProvider(authentication);
        return calculateEarnings(bookings.findByProviderIdOrderByCreatedAtDesc(provider.getId()));
    }

    static EarningsResponse calculateEarnings(List<Booking> providerBookings) {
        List<Booking> completedBookings = providerBookings.stream()
                .filter(booking -> booking.getStatus() == BookingStatus.COMPLETED)
                .filter(booking -> booking.getPaymentStatus() == PaymentStatus.PAID)
                .toList();
        BigDecimal gross = completedBookings.stream()
                .map(Booking::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal commission = gross.multiply(PLATFORM_COMMISSION_RATE);
        return new EarningsResponse(gross, commission, gross.subtract(commission),
                completedBookings.size(), PLATFORM_COMMISSION_RATE);
    }

    @PostMapping("/me/bookings/{id}/{action}")
    public BookingResponse updateBooking(Authentication authentication, @PathVariable Long id,
                                         @PathVariable String action) {
        Provider provider = currentProvider(authentication);
        Booking booking = bookings.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (!booking.getProvider().getId().equals(provider.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        BookingStatus status = switch (action.toLowerCase()) {
            case "accept" -> BookingStatus.ACCEPTED;
            case "reject" -> BookingStatus.REJECTED;
            case "complete" -> BookingStatus.COMPLETED;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported booking action");
        };
        validateTransition(booking.getStatus(), status);
        booking.setStatus(status);
        Booking saved = bookings.save(booking);
        notifications.send(booking.getFarmer(), "BOOKING_STATUS",
                "Booking #" + booking.getId() + " is now " + status.name() + ".");
        return new BookingResponse(saved.getId(), saved.getStatus().name(),
                saved.getStartDate(), saved.getEndDate(), saved.getTotalPrice(),
                saved.getPaymentStatus().name());
    }

    static void validateTransition(BookingStatus current, BookingStatus requested) {
        boolean allowed = switch (current) {
            case PENDING -> requested == BookingStatus.ACCEPTED || requested == BookingStatus.REJECTED;
            case ACCEPTED -> requested == BookingStatus.COMPLETED;
            case REJECTED, COMPLETED, CANCELLED -> false;
        };
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Booking cannot change from " + current + " to " + requested);
        }
    }

    private Provider currentProvider(Authentication authentication) {
        User user = users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return providers.findAll().stream()
                .filter(candidate -> candidate.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
    }

    @PostMapping("/me/equipment")
    @ResponseStatus(HttpStatus.CREATED)
    public EquipmentResponse addEquipment(Authentication authentication,
                                           @Valid @RequestBody CreateEquipmentRequest request) {
        User user = users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Provider provider = providers.findAll().stream()
                .filter(candidate -> candidate.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Provider profile not found"));
        Equipment saved = equipment.save(new Equipment(provider, request.equipmentType(),
                request.equipmentName(), request.pricePerDay(), "AVAILABLE"));
        return new EquipmentResponse(saved.getId(), saved.getEquipmentType(),
                saved.getEquipmentName(), saved.getPricePerDay(),
                saved.getAvailabilityStatus(), provider.getId(),
                provider.getBusinessName(), provider.getRating(), provider.getTrustScore());
    }

    @PutMapping("/me/equipment/{id}/availability")
    public EquipmentResponse updateEquipmentAvailability(Authentication authentication,
                                                         @PathVariable Long id,
                                                         @RequestBody AvailabilityRequest request) {
        Provider provider = currentProvider(authentication);
        Equipment item = equipment.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipment not found"));
        if (!item.getProvider().getId().equals(provider.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        item.setAvailabilityStatus(normalizeAvailability(request.status()));
        Equipment saved = equipment.save(item);
        return new EquipmentResponse(saved.getId(), saved.getEquipmentType(), saved.getEquipmentName(),
                saved.getPricePerDay(), saved.getAvailabilityStatus(), provider.getId(),
                provider.getBusinessName(), provider.getRating(), provider.getTrustScore());
    }

    @PutMapping("/me/equipment/{id}")
    public EquipmentResponse updateEquipment(Authentication authentication, @PathVariable Long id,
                                             @Valid @RequestBody CreateEquipmentRequest request) {
        Provider provider = currentProvider(authentication);
        Equipment item = equipment.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipment not found"));
        ensureOwnership(item.getProvider(), provider);
        item.setEquipmentType(request.equipmentType());
        item.setEquipmentName(request.equipmentName());
        item.setPricePerDay(request.pricePerDay());
        return toEquipmentResponse(equipment.save(item), provider);
    }

    @DeleteMapping("/me/equipment/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEquipment(Authentication authentication, @PathVariable Long id) {
        Provider provider = currentProvider(authentication);
        Equipment item = equipment.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipment not found"));
        ensureOwnership(item.getProvider(), provider);
        if (bookings.existsByEquipmentId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Equipment with booking history cannot be deleted");
        }
        equipment.delete(item);
    }

    private void ensureOwnership(Provider owner, Provider current) {
        if (!owner.getId().equals(current.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }

    private EquipmentResponse toEquipmentResponse(Equipment item, Provider provider) {
        return new EquipmentResponse(item.getId(), item.getEquipmentType(), item.getEquipmentName(),
                item.getPricePerDay(), item.getAvailabilityStatus(), provider.getId(),
                provider.getBusinessName(), provider.getRating(), provider.getTrustScore());
    }

    private String normalizeAvailability(String status) {
        if (!"AVAILABLE".equalsIgnoreCase(status) && !"UNAVAILABLE".equalsIgnoreCase(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Availability must be AVAILABLE or UNAVAILABLE");
        }
        return status.toUpperCase();
    }

    private ProviderResponse toResponse(Provider provider) {
        return new ProviderResponse(provider.getId(), provider.getBusinessName(),
                provider.getProviderType(), provider.getRating(), provider.getTrustScore());
    }

    public record CreateEquipmentRequest(@NotBlank String equipmentType,
                                         @NotBlank String equipmentName,
                                         @NotNull @Positive BigDecimal pricePerDay) {}
    public record AvailabilityRequest(@NotBlank String status) {}
    public record ProviderResponse(Long id, String businessName, String providerType,
                                   BigDecimal rating, BigDecimal trustScore) {}
    public record EquipmentResponse(Long id, String equipmentType, String equipmentName,
                                    BigDecimal pricePerDay, String availabilityStatus,
                                    Long providerId, String providerName, BigDecimal rating,
                                    BigDecimal trustScore) {}
    public record BookingResponse(Long id, String status, java.time.LocalDate startDate,
                                  java.time.LocalDate endDate, BigDecimal totalPrice,
                                  String paymentStatus) {}
    public record EarningsResponse(BigDecimal grossAmount, BigDecimal platformCommission,
                                   BigDecimal netAmount, int completedPaidBookings,
                                   BigDecimal commissionRate) {}
}
