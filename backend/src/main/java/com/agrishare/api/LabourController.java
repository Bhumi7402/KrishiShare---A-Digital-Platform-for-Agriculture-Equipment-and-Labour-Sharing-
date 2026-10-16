package com.agrishare.api;

import com.agrishare.domain.LabourGroup;
import com.agrishare.domain.Provider;
import com.agrishare.domain.User;
import com.agrishare.repository.LabourGroupRepository;
import com.agrishare.repository.BookingRepository;
import com.agrishare.repository.ProviderRepository;
import com.agrishare.repository.UserRepository;
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
@RequestMapping("/api/labour")
public class LabourController {
    private final LabourGroupRepository labourGroups;
    private final ProviderRepository providers;
    private final UserRepository users;
    private final BookingRepository bookings;

    public LabourController(LabourGroupRepository labourGroups, ProviderRepository providers,
                            UserRepository users, BookingRepository bookings) {
        this.labourGroups = labourGroups;
        this.providers = providers;
        this.users = users;
        this.bookings = bookings;
    }

    @GetMapping
    public List<LabourResponse> list(@RequestParam(defaultValue = "") String skill) {
        return labourGroups.findByAvailabilityStatusAndSkillTypeContainingIgnoreCase("AVAILABLE", skill)
                .stream().map(this::toResponse).toList();
    }

    @GetMapping("/me")
    public List<LabourResponse> mine(Authentication authentication) {
        return labourGroups.findByProviderId(currentProvider(authentication).getId())
                .stream().map(this::toResponse).toList();
    }

    @PostMapping("/me")
    @ResponseStatus(HttpStatus.CREATED)
    public LabourResponse create(Authentication authentication,
                                 @Valid @RequestBody CreateLabourRequest request) {
        LabourGroup saved = labourGroups.save(new LabourGroup(currentProvider(authentication),
                request.groupName(), request.workerCount(), request.skillType(), request.pricePerDay()));
        return toResponse(saved);
    }

    @PutMapping("/me/{id}/availability")
    public LabourResponse updateAvailability(Authentication authentication, @PathVariable Long id,
                                             @Valid @RequestBody AvailabilityRequest request) {
        Provider provider = currentProvider(authentication);
        LabourGroup group = labourGroups.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Labour group not found"));
        if (!group.getProvider().getId().equals(provider.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (!"AVAILABLE".equalsIgnoreCase(request.status())
                && !"UNAVAILABLE".equalsIgnoreCase(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Availability must be AVAILABLE or UNAVAILABLE");
        }
        group.setAvailabilityStatus(request.status().toUpperCase());
        return toResponse(labourGroups.save(group));
    }

    @PutMapping("/me/{id}")
    public LabourResponse update(Authentication authentication, @PathVariable Long id,
                                @Valid @RequestBody CreateLabourRequest request) {
        Provider provider = currentProvider(authentication);
        LabourGroup group = labourGroups.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Labour group not found"));
        ensureOwnership(group.getProvider(), provider);
        group.setGroupName(request.groupName());
        group.setWorkerCount(request.workerCount());
        group.setSkillType(request.skillType());
        group.setPricePerDay(request.pricePerDay());
        return toResponse(labourGroups.save(group));
    }

    @DeleteMapping("/me/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable Long id) {
        Provider provider = currentProvider(authentication);
        LabourGroup group = labourGroups.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Labour group not found"));
        ensureOwnership(group.getProvider(), provider);
        if (bookings.existsByLabourGroupId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Labour group with booking history cannot be deleted");
        }
        labourGroups.delete(group);
    }

    private void ensureOwnership(Provider owner, Provider current) {
        if (!owner.getId().equals(current.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }

    private Provider currentProvider(Authentication authentication) {
        User user = users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return providers.findAll().stream()
                .filter(provider -> provider.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
    }

    private LabourResponse toResponse(LabourGroup group) {
        Provider provider = group.getProvider();
        return new LabourResponse(group.getId(), group.getGroupName(), group.getWorkerCount(),
                group.getSkillType(), group.getPricePerDay(), group.getAvailabilityStatus(),
                provider.getId(), provider.getBusinessName(), provider.getRating(),
                provider.getTrustScore());
    }

    public record CreateLabourRequest(@NotBlank String groupName, @NotNull @Positive Integer workerCount,
                                      @NotBlank String skillType, @NotNull @Positive BigDecimal pricePerDay) {}
    public record AvailabilityRequest(@NotBlank String status) {}
    public record LabourResponse(Long id, String groupName, Integer workerCount, String skillType,
                                 BigDecimal pricePerDay, String availabilityStatus, Long providerId,
                                 String providerName, BigDecimal rating, BigDecimal trustScore) {}
}
