package com.agrishare.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class RazorpayServiceTest {
    @Test
    void verifiesRazorpayHmacSignature() throws Exception {
        RazorpayService service = new RazorpayService("rzp_test_key", "test_secret");
        String orderId = "order_123";
        String paymentId = "pay_456";
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("test_secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = HexFormat.of().formatHex(
                mac.doFinal((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8)));

        assertTrue(service.verify(orderId, paymentId, signature));
        assertFalse(service.verify(orderId, paymentId, "invalid"));
        assertFalse(service.verify(orderId, paymentId, null));
    }

    @Test
    void rejectsVerificationWhenCredentialsAreMissing() {
        RazorpayService service = new RazorpayService("", "");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.verify("order_123", "pay_456", "signature"));

        assertTrue(exception.getMessage().contains("Razorpay is not configured"));
    }
}
