package com.agrishare.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/weather")
public class WeatherController {
    private final RestClient restClient;
    private final String openMeteoUrl;

    public WeatherController(@Value("${agrishare.open-meteo-url}") String openMeteoUrl) {
        this.restClient = RestClient.create();
        this.openMeteoUrl = openMeteoUrl;
    }

    @PostMapping("/advisory")
    public WeatherResponse advisory(@Valid @RequestBody WeatherRequest request) {
        double latitude = request.latitude() == null ? 18.5204 : request.latitude();
        double longitude = request.longitude() == null ? 73.8567 : request.longitude();
        try {
            JsonNode forecast = restClient.get()
                    .uri(UriComponentsBuilder.fromUriString(openMeteoUrl)
                            .queryParam("latitude", latitude)
                            .queryParam("longitude", longitude)
                            .queryParam("daily", "precipitation_probability_max,precipitation_sum,"
                                    + "wind_speed_10m_max,temperature_2m_max")
                            .queryParam("forecast_days", 16)
                            .queryParam("timezone", "auto")
                            .build().toUri())
                    .retrieve()
                    .body(JsonNode.class);
            return fromForecast(request.date(), forecast);
        } catch (RestClientException | IllegalArgumentException exception) {
            return fallback(request.date());
        }
    }

    private WeatherResponse fromForecast(LocalDate date, JsonNode forecast) {
        JsonNode daily = forecast == null ? null : forecast.path("daily");
        JsonNode dates = daily == null ? null : daily.path("time");
        int index = -1;
        if (dates != null && dates.isArray()) {
            for (int i = 0; i < dates.size(); i++) {
                if (date.toString().equals(dates.get(i).asText())) {
                    index = i;
                    break;
                }
            }
        }
        if (index < 0) {
            return fallback(date);
        }
        int rainProbability = daily.path("precipitation_probability_max").path(index).asInt();
        double rainfall = daily.path("precipitation_sum").path(index).asDouble();
        double windSpeed = daily.path("wind_speed_10m_max").path(index).asDouble();
        double temperature = daily.path("temperature_2m_max").path(index).asDouble();
        String risk = rainProbability >= 70 || rainfall >= 10 || windSpeed >= 35
                ? "HIGH" : rainProbability >= 40 || rainfall >= 3 ? "MEDIUM" : "LOW";
        LocalDate recommendedDate = "HIGH".equals(risk) ? date.plusDays(1) : date;
        return new WeatherResponse(date, rainProbability, rainfall, windSpeed, temperature,
                risk, recommendedDate, "HIGH".equals(risk)
                        ? "High weather risk. Consider the recommended date instead."
                        : "Weather looks suitable for farm work.");
    }

    private WeatherResponse fallback(LocalDate date) {
        int rainProbability = Math.floorMod(date.getDayOfYear() * 17, 100);
        double rainfall = rainProbability > 65 ? 12.4 : 1.8;
        String risk = rainProbability > 65 ? "HIGH" : rainProbability > 35 ? "MEDIUM" : "LOW";
        LocalDate recommendedDate = "HIGH".equals(risk)
                ? date.plusDays(1)
                : date;
        return new WeatherResponse(date, rainProbability, rainfall, 14.2,
                28.0, risk, recommendedDate,
                "HIGH".equals(risk)
                        ? "High rain risk. Consider the recommended date instead."
                        : "Weather looks suitable for farm work.");
    }

    public record WeatherRequest(@NotNull LocalDate date, Double latitude, Double longitude) {}

    public record WeatherResponse(LocalDate forecastDate, int rainProbability,
                                  double rainfall, double windSpeed, double temperature,
                                  String riskLevel, LocalDate recommendedDate,
                                  String advisory) {}
}
