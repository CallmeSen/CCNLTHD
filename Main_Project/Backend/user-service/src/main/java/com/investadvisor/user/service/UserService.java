package com.investadvisor.user.service;

import com.investadvisor.user.dto.RegisterRequest;
import com.investadvisor.user.dto.UserDto;
import com.investadvisor.user.kafka.UserEventProducer;
import com.investadvisor.user.kafka.events.UserEvent;
import com.investadvisor.user.model.Role;
import com.investadvisor.user.model.User;
import com.investadvisor.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserEventProducer userEventProducer;

    /** Used by Spring Security to load users during authentication. */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    @Transactional
    public UserDto register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already in use: " + request.email());
        }

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .phone(request.phone())
                .role(Role.USER)
                .enabled(true)
                .build();

        User saved = userRepository.save(user);
        log.info("Registered new user: {} ({})", saved.getEmail(), saved.getId());

        userEventProducer.publish(UserEvent.of("USER_REGISTERED", saved));
        return UserDto.from(saved);
    }

    @Transactional(readOnly = true)
    public UserDto findById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + id));
        return UserDto.from(user);
    }

    @Transactional(readOnly = true)
    public UserDto findByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
        return UserDto.from(user);
    }

    @Transactional
    public UserDto updateProfile(UUID id, String fullName, String phone) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + id));
        user.setFullName(fullName);
        user.setPhone(phone);
        User saved = userRepository.save(user);
        userEventProducer.publish(UserEvent.of("USER_UPDATED", saved));
        return UserDto.from(saved);
    }
}
