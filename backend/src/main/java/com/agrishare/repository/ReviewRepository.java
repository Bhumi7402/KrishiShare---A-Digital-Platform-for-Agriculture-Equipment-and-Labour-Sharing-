package com.agrishare.repository;

import com.agrishare.domain.Review;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    boolean existsByBookingId(Long bookingId);
    List<Review> findByProviderIdOrderByCreatedAtDesc(Long providerId);
}
