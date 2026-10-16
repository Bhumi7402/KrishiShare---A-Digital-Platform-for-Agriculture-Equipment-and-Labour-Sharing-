package com.agrishare.repository;

import com.agrishare.domain.Notification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop50ByUserEmailIgnoreCaseOrderByCreatedAtDesc(String email);
    List<Notification> findByUserEmailIgnoreCaseAndReadFalse(String email);
    Optional<Notification> findByIdAndUserEmailIgnoreCase(Long id, String email);

    @Transactional
    @Modifying
    void deleteByUserEmailIgnoreCaseAndReadTrue(String email);
}
