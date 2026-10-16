package com.agrishare.api;

import com.agrishare.repository.ProviderRepository;
import com.agrishare.repository.EquipmentRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matching")
public class MatchingController {
    private final ProviderRepository providers;
    private final EquipmentRepository equipment;

    public MatchingController(ProviderRepository providers, EquipmentRepository equipment) {
        this.providers = providers;
        this.equipment = equipment;
    }

    @GetMapping("/recommendations")
    public List<MatchResponse> recommendations(
            @RequestParam(required = false) Double farmerLat,
            @RequestParam(required = false) Double farmerLon) {
        List<BigDecimal> prices = equipment.findAll().stream()
                .map(item -> item.getPricePerDay())
                .toList();
        BigDecimal maxPrice = prices.stream().max(BigDecimal::compareTo).orElse(BigDecimal.ONE);
        return providers.findAll().stream()
                .map(provider -> toMatch(provider, farmerLat, farmerLon, maxPrice))
                .sorted((left, right) -> right.finalScore().compareTo(left.finalScore()))
                .toList();
    }

    private MatchResponse toMatch(com.agrishare.domain.Provider provider, Double farmerLat,
                                  Double farmerLon, BigDecimal maxPrice) {
        List<com.agrishare.domain.Equipment> listings = equipment.findByProviderId(provider.getId());
        BigDecimal availability = listings.stream()
                .anyMatch(item -> "AVAILABLE".equalsIgnoreCase(item.getAvailabilityStatus()))
                ? BigDecimal.valueOf(100) : BigDecimal.ZERO;
        BigDecimal providerPrice = listings.stream().map(item -> item.getPricePerDay())
                .min(BigDecimal::compareTo).orElse(maxPrice);
        BigDecimal priceScore = maxPrice.signum() == 0
                ? BigDecimal.valueOf(100)
                : BigDecimal.valueOf(100).subtract(providerPrice
                    .divide(maxPrice, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)))
                    .max(BigDecimal.ZERO);
        BigDecimal ratingScore = provider.getRating().divide(BigDecimal.valueOf(5), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        BigDecimal trustScore = provider.getTrustScore().min(BigDecimal.valueOf(100)).max(BigDecimal.ZERO);
        BigDecimal distanceScore = distanceScore(provider, farmerLat, farmerLon);
        BigDecimal finalScore = availability.multiply(BigDecimal.valueOf(.30))
                .add(distanceScore.multiply(BigDecimal.valueOf(.25)))
                .add(ratingScore.multiply(BigDecimal.valueOf(.20)))
                .add(priceScore.multiply(BigDecimal.valueOf(.15)))
                .add(trustScore.multiply(BigDecimal.valueOf(.10)))
                .setScale(2, RoundingMode.HALF_UP);
        return new MatchResponse(provider.getId(), provider.getBusinessName(), provider.getRating(),
                provider.getTrustScore(), finalScore, availability, distanceScore, ratingScore,
                priceScore, "Weighted match: availability 30%, distance 25%, rating 20%, price 15%, trust 10%");
    }

    private BigDecimal distanceScore(com.agrishare.domain.Provider provider, Double farmerLat, Double farmerLon) {
        Double providerLat = provider.getUser().getLatitude();
        Double providerLon = provider.getUser().getLongitude();
        if (farmerLat == null || farmerLon == null || providerLat == null || providerLon == null) {
            return BigDecimal.valueOf(50);
        }
        double earthRadiusKm = 6371;
        double latDistance = Math.toRadians(providerLat - farmerLat);
        double lonDistance = Math.toRadians(providerLon - farmerLon);
        double haversine = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(farmerLat)) * Math.cos(Math.toRadians(providerLat))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double distanceKm = earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
        return BigDecimal.valueOf(Math.max(0, 100 - Math.min(distanceKm, 100)));
    }

    public record MatchResponse(Long providerId, String providerName,
                                BigDecimal rating, BigDecimal trustScore,
                                BigDecimal finalScore, BigDecimal availabilityScore,
                                BigDecimal distanceScore, BigDecimal ratingScore,
                                BigDecimal priceScore, String explanation) {}
}
