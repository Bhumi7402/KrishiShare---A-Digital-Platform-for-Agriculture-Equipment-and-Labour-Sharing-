package com.agrishare.repository;

import com.agrishare.domain.Booking;
import com.agrishare.domain.BookingStatus;
import java.time.LocalDate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByFarmerEmailIgnoreCaseOrderByCreatedAtDesc(String email);
    List<Booking> findByProviderIdOrderByCreatedAtDesc(Long providerId);
    boolean existsByEquipmentId(Long equipmentId);
    boolean existsByLabourGroupId(Long labourGroupId);

    boolean existsByEquipmentIdAndStatusInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long equipmentId, java.util.Collection<BookingStatus> statuses,
            LocalDate endDate, LocalDate startDate);

    boolean existsByLabourGroupIdAndStatusInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long labourGroupId, java.util.Collection<BookingStatus> statuses,
            LocalDate endDate, LocalDate startDate);
}
