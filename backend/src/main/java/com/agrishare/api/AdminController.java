package com.agrishare.api;

import com.agrishare.domain.UserRole;
import com.agrishare.domain.BookingStatus;
import com.agrishare.repository.BookingRepository;
import com.agrishare.repository.EquipmentRepository;
import com.agrishare.repository.ProviderRepository;
import com.agrishare.repository.UserRepository;
import java.math.BigDecimal;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.*;
import com.agrishare.service.NotificationService;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserRepository users;
    private final ProviderRepository providers;
    private final EquipmentRepository equipment;
    private final BookingRepository bookings;
    private final NotificationService notifications;

    public AdminController(UserRepository users, ProviderRepository providers,
                           EquipmentRepository equipment, BookingRepository bookings,
                           NotificationService notifications) {
        this.users = users;
        this.providers = providers;
        this.equipment = equipment;
        this.bookings = bookings;
        this.notifications = notifications;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        BigDecimal revenue = bookings.findAll().stream()
                .filter(booking -> booking.getStatus() == BookingStatus.COMPLETED)
                .map(booking -> booking.getTotalPrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long cancelledBookings = bookings.findAll().stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CANCELLED)
                .count();
        return Map.of(
                "totalFarmers", users.findAll().stream().filter(user -> user.getRole() == UserRole.FARMER).count(),
                "totalProviders", providers.count(),
                "totalEquipment", equipment.count(),
                "totalBookings", bookings.count(),
                "cancelledBookings", cancelledBookings,
                "totalRevenue", revenue,
                "demandForecast", "Sprayer demand expected to increase by 40% next month");
    }

    @GetMapping("/providers")
    public java.util.List<ProviderAdminResponse> providers() {
        return providers.findAll().stream()
                .map(provider -> new ProviderAdminResponse(provider.getId(),
                        provider.getBusinessName(), provider.getProviderType(),
                        provider.getUser().getEmail(), provider.getVerificationStatus()))
                .toList();
    }

    @PutMapping("/providers/{id}/verification")
    public ProviderAdminResponse updateVerification(@PathVariable Long id,
                                                     @RequestBody VerificationRequest request) {
        var provider = providers.findById(id).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Provider not found"));
        if (!java.util.Set.of("PENDING", "VERIFIED", "SUSPENDED")
                .contains(request.status().toUpperCase())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Verification status must be PENDING, VERIFIED, or SUSPENDED");
        }
        provider.setVerificationStatus(request.status().toUpperCase());
        var saved = providers.save(provider);
        notifications.send(saved.getUser(), "PROVIDER_VERIFICATION",
                "Your provider account verification status has been updated to " + request.status().toUpperCase() + ".");
        return new ProviderAdminResponse(saved.getId(), saved.getBusinessName(),
                saved.getProviderType(), saved.getUser().getEmail(),
                saved.getVerificationStatus());
    }

    public record VerificationRequest(String status) {}
    public record ProviderAdminResponse(Long id, String businessName, String providerType,
                                        String email, String verificationStatus) {}
}
