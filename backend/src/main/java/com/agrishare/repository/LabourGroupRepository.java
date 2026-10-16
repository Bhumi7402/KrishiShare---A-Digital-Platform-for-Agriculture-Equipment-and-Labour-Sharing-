package com.agrishare.repository;

import com.agrishare.domain.LabourGroup;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LabourGroupRepository extends JpaRepository<LabourGroup, Long> {
    List<LabourGroup> findByAvailabilityStatusAndSkillTypeContainingIgnoreCase(
            String availabilityStatus, String skillType);
    List<LabourGroup> findByProviderId(Long providerId);
}
