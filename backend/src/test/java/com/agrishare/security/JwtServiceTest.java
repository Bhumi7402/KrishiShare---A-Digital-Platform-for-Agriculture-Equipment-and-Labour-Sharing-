package com.agrishare.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.agrishare.domain.User;
import com.agrishare.domain.UserRole;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

class JwtServiceTest {
    private final JwtService jwtService = new JwtService(
            "test-secret-that-is-longer-than-thirty-two-characters");

    @Test
    void tokenContainsSubjectAndRole() {
        User user = new User("Provider", "provider@test.local", "hash", UserRole.PROVIDER);

        String token = jwtService.createToken(user);

        assertEquals("provider@test.local", jwtService.subject(token));
        assertEquals("PROVIDER", jwtService.role(token));
    }

    @Test
    void rejectsTamperedToken() {
        User user = new User("Farmer", "farmer@test.local", "hash", UserRole.FARMER);
        String token = jwtService.createToken(user);

        assertThrows(JwtException.class, () -> jwtService.subject(token + "tampered"));
    }
}
