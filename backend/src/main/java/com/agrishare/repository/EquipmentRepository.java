package com.agrishare.repository;

import com.agrishare.domain.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EquipmentRepository extends JpaRepository<Equipment, Long> {
    List<Equipment> findByAvailabilityStatusAndEquipmentTypeContainingIgnoreCase(
            String availabilityStatus, String equipmentType);
    List<Equipment> findByProviderId(Long providerId);
}
