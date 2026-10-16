package com.agrishare.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.agrishare.domain.User;
import com.agrishare.domain.UserRole;
import com.agrishare.repository.ProviderRepository;
import com.agrishare.repository.UserRepository;
import com.agrishare.security.JwtService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {
    @Mock
    private UserRepository users;
    @Mock
    private ProviderRepository providers;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @InjectMocks
    private AuthController controller;

    @Test
    void registrationCannotCreateAdminRole() {
        when(users.existsByEmailIgnoreCase("admin@test.local")).thenReturn(false);
        when(passwordEncoder.encode("secret")).thenReturn("encoded");
        User saved = new User("Admin", "admin@test.local", "encoded", UserRole.FARMER);
        when(users.save(any(User.class))).thenReturn(saved);
        when(jwtService.createToken(saved)).thenReturn("token");

        AuthController.AuthResponse response = controller.register(
                new AuthController.RegisterRequest("Admin", "admin@test.local", "secret", UserRole.ADMIN));

        assertEquals("FARMER", response.role());
        assertNotNull(response.token());
        verify(users).save(argThat(user -> user.getRole() == UserRole.FARMER));
    }

    @Test
    void loginReturnsTokenForValidCredentials() {
        User user = new User("Farmer", "farmer@test.local", "encoded", UserRole.FARMER);
        when(users.findByEmailIgnoreCase("farmer@test.local")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "encoded")).thenReturn(true);
        when(jwtService.createToken(user)).thenReturn("token");

        AuthController.AuthResponse response = controller.login(
                new AuthController.LoginRequest("farmer@test.local", "secret"));

        assertEquals("token", response.token());
        assertEquals("FARMER", response.role());
    }

    @Test
    void registrationCreatesProviderProfileForProviderRole() {
        when(users.existsByEmailIgnoreCase("provider@test.local")).thenReturn(false);
        when(passwordEncoder.encode("secret")).thenReturn("encoded");
        User saved = new User("Provider", "provider@test.local", "encoded", UserRole.PROVIDER);
        when(users.save(any(User.class))).thenReturn(saved);
        when(jwtService.createToken(saved)).thenReturn("token");

        controller.register(new AuthController.RegisterRequest(
                "Provider", "provider@test.local", "secret", UserRole.PROVIDER));

        verify(providers).save(argThat(provider ->
                provider.getUser() == saved
                        && provider.getBusinessName().equals("Provider's Farm Services")
                        && provider.getProviderType().equals("EQUIPMENT_OWNER")
                        && provider.getVerificationStatus().equals("PENDING")));
    }
}
