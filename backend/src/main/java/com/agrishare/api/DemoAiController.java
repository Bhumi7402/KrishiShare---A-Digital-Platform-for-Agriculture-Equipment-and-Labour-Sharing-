package com.agrishare.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class DemoAiController {
    @PostMapping("/task-plan")
    @ResponseStatus(HttpStatus.OK)
    public TaskPlanResponse taskPlan(@Valid @RequestBody TaskPlanRequest request) {
        int workers = Math.max(2, (int) Math.round(request.landArea() * 1.6));
        int days = Math.max(1, (int) Math.round(request.landArea() / 3));
        String equipment = request.taskType().toLowerCase().contains("spray")
                ? "Sprayer"
                : "Tractor";
        return new TaskPlanResponse(request.taskType(), workers, equipment, days);
    }

    @PostMapping("/price-recommendation")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> priceRecommendation(
            @Valid @RequestBody PriceRequest request) {
        BigDecimal raw = request.basePrice().multiply(request.demandMultiplier());
        BigDecimal minimum = request.basePrice().multiply(BigDecimal.valueOf(0.8));
        BigDecimal maximum = request.basePrice().multiply(BigDecimal.valueOf(1.4));
        BigDecimal recommended = raw.max(minimum).min(maximum).setScale(2, RoundingMode.HALF_UP);
        return Map.of(
                "basePrice", request.basePrice(),
                "recommendedPrice", recommended,
                "demandLevel", request.demandMultiplier().compareTo(BigDecimal.valueOf(1.1)) > 0
                        ? "HIGH"
                        : "NORMAL");
    }

    public record TaskPlanRequest(
            @Positive double landArea,
            @NotBlank String taskType) {
    }

    public record TaskPlanResponse(
            String taskType,
            int requiredWorkers,
            String requiredEquipment,
            int estimatedDays) {
    }

    public record PriceRequest(
            @Positive BigDecimal basePrice,
            @PositiveOrZero BigDecimal demandMultiplier) {
    }
}
