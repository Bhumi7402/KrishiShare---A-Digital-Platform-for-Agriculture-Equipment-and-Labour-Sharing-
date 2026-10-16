package com.agrishare.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class RazorpayService {
    private final RestClient client = RestClient.create("https://api.razorpay.com/v1");
    private final String keyId;
    private final String keySecret;

    public RazorpayService(@Value("${agrishare.razorpay-key-id:}") String keyId,
                           @Value("${agrishare.razorpay-key-secret:}") String keySecret) {
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    public Order createOrder(Long bookingId, BigDecimal amount) {
        requireConfigured();
        String credentials = Base64.getEncoder().encodeToString(
                (keyId + ":" + keySecret).getBytes(StandardCharsets.UTF_8));
        JsonNode response = client.post().uri("/orders")
                .header(HttpHeaders.AUTHORIZATION, "Basic " + credentials)
                .body(java.util.Map.of(
                        "amount", amount.movePointRight(2).longValueExact(),
                        "currency", "INR",
                        "receipt", "booking_" + bookingId))
                .retrieve().body(JsonNode.class);
        return new Order(response.path("id").asText(), keyId,
                response.path("amount").asLong(), response.path("currency").asText());
    }

    public boolean verify(String orderId, String paymentId, String signature) {
        requireConfigured();
        if (orderId == null || orderId.isBlank()
                || paymentId == null || paymentId.isBlank()
                || signature == null || signature.isBlank()) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8));
            return java.security.MessageDigest.isEqual(
                    toHex(digest).getBytes(StandardCharsets.UTF_8),
                    signature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Payment signature verification failed", exception);
        }
    }

    private void requireConfigured() {
        if (keyId.isBlank() || keySecret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Razorpay is not configured");
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte value : bytes) result.append(String.format("%02x", value));
        return result.toString();
    }

    public record Order(String id, String keyId, long amount, String currency) {}
}
