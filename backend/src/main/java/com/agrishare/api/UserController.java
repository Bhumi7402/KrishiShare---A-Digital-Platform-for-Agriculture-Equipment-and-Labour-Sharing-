package com.agrishare.api;

import com.agrishare.domain.User;
import com.agrishare.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/me")
    public ProfileResponse me(Authentication authentication) {
        return toResponse(currentUser(authentication));
    }

    @PutMapping("/me")
    public ProfileResponse update(Authentication authentication,
                                  @Valid @RequestBody ProfileRequest request) {
        User user = currentUser(authentication);
        user.setName(request.name());
        user.setPhone(request.phone());
        user.setVillage(request.village());
        user.setDistrict(request.district());
        user.setLatitude(request.latitude());
        user.setLongitude(request.longitude());
        return toResponse(users.save(user));
    }

    private User currentUser(Authentication authentication) {
        return users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private ProfileResponse toResponse(User user) {
        return new ProfileResponse(user.getName(), user.getEmail(), user.getPhone(),
                user.getVillage(), user.getDistrict(), user.getLatitude(), user.getLongitude());
    }

    public record ProfileRequest(@NotBlank String name, String phone, String village,
                                 String district,
                                 @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
                                 @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude) {}
    public record ProfileResponse(String name, String email, String phone, String village,
                                  String district, Double latitude, Double longitude) {}
}
