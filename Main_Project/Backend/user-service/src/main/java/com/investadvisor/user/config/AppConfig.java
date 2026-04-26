package com.investadvisor.user.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * General application beans kept separate from SecurityConfig
 * to avoid circular dependency:
 *   SecurityConfig -> JwtAuthenticationFilter -> UserService -> PasswordEncoder -> SecurityConfig
 */
@Configuration
public class AppConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
