package com.agrishare.api;

import com.agrishare.domain.Equipment;
import com.agrishare.repository.EquipmentRepository;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {
    private final EquipmentRepository equipment;

    public EquipmentController(EquipmentRepository equipment) {
        this.equipment = equipment;
    }

    @GetMapping
    public List<EquipmentResponse> search(
            @RequestParam(defaultValue = "") String type) {
        return equipment.findByAvailabilityStatusAndEquipmentTypeContainingIgnoreCase("AVAILABLE", type)
                .stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public EquipmentResponse get(@PathVariable Long id) {
        return equipment.findById(id).map(this::toResponse)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Equipment not found"));
    }

    private EquipmentResponse toResponse(Equipment item) {
        return new EquipmentResponse(item.getId(), item.getEquipmentType(), item.getEquipmentName(),
                item.getPricePerDay(), item.getAvailabilityStatus(), item.getProvider().getId(),
                item.getProvider().getBusinessName(), item.getProvider().getRating(),
                item.getProvider().getTrustScore());
    }

    public record EquipmentResponse(Long id, String equipmentType, String equipmentName,
                                    java.math.BigDecimal pricePerDay, String availabilityStatus,
                                    Long providerId, String providerName,
                                    java.math.BigDecimal rating, java.math.BigDecimal trustScore) {}
}
