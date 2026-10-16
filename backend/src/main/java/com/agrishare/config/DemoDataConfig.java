package com.agrishare.config;

import com.agrishare.domain.Equipment;
import com.agrishare.domain.Provider;
import com.agrishare.domain.User;
import com.agrishare.domain.UserRole;
import com.agrishare.repository.EquipmentRepository;
import com.agrishare.repository.ProviderRepository;
import com.agrishare.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DemoDataConfig {
    @Bean
    CommandLineRunner seedDemoData(UserRepository users, ProviderRepository providers,
                                   EquipmentRepository equipment, PasswordEncoder encoder) {
        return args -> {
            if (users.count() > 0) {
                return;
            }
            users.save(new User("Ganesh Patil", "farmer@agrishare.demo",
                    encoder.encode("password123"), UserRole.FARMER));
            User providerUser = users.save(new User("Ramesh More", "provider@agrishare.demo",
                    encoder.encode("password123"), UserRole.PROVIDER));
            users.save(new User("Admin", "admin@agrishare.demo",
                    encoder.encode("password123"), UserRole.ADMIN));
            Provider provider = providers.save(new Provider(providerUser,
                    "More Farm Services", "BOTH"));
            equipment.save(new Equipment(provider, "Sprayer", "Mahindra 600L Sprayer",
                    java.math.BigDecimal.valueOf(1800), "AVAILABLE"));
            equipment.save(new Equipment(provider, "Tractor", "Swaraj 744 Tractor",
                    java.math.BigDecimal.valueOf(2500), "AVAILABLE"));
        };
    }
}
