package com.agrishare.api;

import com.agrishare.domain.User;
import com.agrishare.domain.UserRole;
import com.agrishare.domain.Provider;
import com.agrishare.repository.ProviderRepository;
import com.agrishare.repository.UserRepository;
import com.agrishare.security.JwtService;
import jakarta.validation.Valid;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users;
    private final ProviderRepository providers;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository users, ProviderRepository providers,
                          PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.providers = providers;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        if (users.existsByEmailIgnoreCase(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        UserRole requestedRole = request.role() == UserRole.PROVIDER
                ? UserRole.PROVIDER : UserRole.FARMER;
        User user = users.save(new User(
                request.name(),
                request.email().toLowerCase(),
                passwordEncoder.encode(request.password()),
                requestedRole));
        if (requestedRole == UserRole.PROVIDER) {
            providers.save(new Provider(user, request.name() + "'s Farm Services", "EQUIPMENT_OWNER"));
        }
        return new AuthResponse(jwtService.createToken(user), user.getName(), user.getRole().name());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        User user = users.findByEmailIgnoreCase(request.email())
                .filter(candidate -> passwordEncoder.matches(request.password(), candidate.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        return new AuthResponse(jwtService.createToken(user), user.getName(), user.getRole().name());
    }

    public record RegisterRequest(@NotBlank String name, @Email @NotBlank String email,
                                  @NotBlank String password, UserRole role) {}
    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record AuthResponse(String token, String name, String role) {}
}
