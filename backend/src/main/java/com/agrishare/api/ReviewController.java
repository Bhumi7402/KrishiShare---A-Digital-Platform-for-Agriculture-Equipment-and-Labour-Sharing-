package com.agrishare.api;

import com.agrishare.domain.*;
import com.agrishare.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.agrishare.service.NotificationService;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {
    private final ReviewRepository reviews;
    private final BookingRepository bookings;
    private final UserRepository users;
    private final ProviderRepository providers;
    private final NotificationService notifications;

    public ReviewController(ReviewRepository reviews, BookingRepository bookings,
                            UserRepository users, ProviderRepository providers,
                            NotificationService notifications) {
        this.reviews = reviews;
        this.bookings = bookings;
        this.users = users;
        this.providers = providers;
        this.notifications = notifications;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse create(Authentication authentication,
                                 @Valid @RequestBody CreateReviewRequest request) {
        User farmer = users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Booking booking = bookings.findById(request.bookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (!booking.getFarmer().getId().equals(farmer.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only completed bookings can be reviewed");
        }
        if (reviews.existsByBookingId(booking.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking already has a review");
        }
        Review saved = reviews.save(new Review(booking, farmer, booking.getProvider(),
                request.rating(), request.comment()));
        List<Review> providerReviews = reviews.findByProviderIdOrderByCreatedAtDesc(
                booking.getProvider().getId());
        BigDecimal average = providerReviews.stream().map(Review::getRating)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(providerReviews.size()), 2, RoundingMode.HALF_UP);
        booking.getProvider().setRating(average);
        providers.save(booking.getProvider());
        notifications.send(booking.getProvider().getUser(), "REVIEW_RECEIVED",
                "Farmer left a " + request.rating() + "★ review for booking #" + booking.getId() + ".");
        return toResponse(saved);
    }

    @GetMapping("/provider/{providerId}")
    public List<ReviewResponse> providerReviews(@PathVariable Long providerId) {
        return reviews.findByProviderIdOrderByCreatedAtDesc(providerId).stream()
                .map(this::toResponse).toList();
    }

    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(review.getId(), review.getBooking().getId(),
                review.getProvider().getId(), review.getRating(), review.getComment(),
                review.getCreatedAt());
    }

    public record CreateReviewRequest(Long bookingId,
            @DecimalMin("1.0") @DecimalMax("5.0") BigDecimal rating,
            @Size(max = 1000) String comment) {}
    public record ReviewResponse(Long id, Long bookingId, Long providerId,
                                 BigDecimal rating, String comment,
                                 java.time.OffsetDateTime createdAt) {}
}
