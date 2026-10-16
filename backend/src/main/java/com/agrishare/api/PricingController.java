package com.agrishare.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pricing")
public class PricingController {
    @PostMapping("/recommendation")
    public PriceResponse recommendation(@Valid @RequestBody PriceRequest request) {
        BigDecimal raw = request.basePrice().multiply(request.demandMultiplier());
        BigDecimal minimum = request.basePrice().multiply(BigDecimal.valueOf(.8));
        BigDecimal maximum = request.basePrice().multiply(BigDecimal.valueOf(1.4));
        BigDecimal recommended = raw.max(minimum).min(maximum).setScale(2, RoundingMode.HALF_UP);
        String demand = request.demandMultiplier().compareTo(BigDecimal.valueOf(1.1)) > 0
                ? "HIGH" : request.demandMultiplier().compareTo(BigDecimal.valueOf(.9)) < 0
                ? "LOW" : "NORMAL";
        return new PriceResponse(request.basePrice(), recommended, demand,
                "Price is constrained to the safe -20% to +40% range.");
    }

    public record PriceRequest(@NotNull @Positive BigDecimal basePrice,
                               @NotNull @Positive BigDecimal demandMultiplier) {}
    public record PriceResponse(BigDecimal basePrice, BigDecimal recommendedPrice,
                                String demandLevel, String explanation) {}
}
