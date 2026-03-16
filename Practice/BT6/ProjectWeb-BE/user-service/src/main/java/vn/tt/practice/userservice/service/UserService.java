package vn.tt.practice.userservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import vn.tt.practice.userservice.dto.UserDTO;
import vn.tt.practice.userservice.mapper.UserMapper;
import vn.tt.practice.userservice.model.User;
import vn.tt.practice.userservice.repository.UserRepo;
import vn.tt.practice.userservice.util.JWTUtil;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepo userRepo;
    private final UserMapper userMapper;
    private final JWTUtil jwtUtil;
    private final RedisTemplate redisTemplate;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public Map<String, Object> register(UserDTO userDTO) {
        if (userRepo.findByEmail(userDTO.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        userDTO.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        userDTO.setExpirationDate(86400);
        userDTO.setIsAdmin(false);

        User user = userRepo.save(userMapper.toEntity(userDTO));
        UserDTO savedUserDTO = userMapper.toDTO(user);
        String token = jwtUtil.generateToken(savedUserDTO);
        redisTemplate.opsForValue().set(token, "valid", Duration.ofMillis(86400000));

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Registered Successfully");
        response.put("token", token);
        response.put("user", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "username", user.getUsername(),
                "isAdmin", user.getIsAdmin()
        ));

//        return userMapper.toDTO(userRepo.save(userMapper.toEntity(userDTO)));
        return response;

    }

    public Map<String, Object> login(UserDTO userDTO) {
        Optional<User> userOpt = userRepo.findByEmail(userDTO.getEmail());

        if (userOpt.isEmpty() || !passwordEncoder.matches(userDTO.getPassword(), userOpt.get().getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        User user = userOpt.get();

        UserDTO payload = UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .expirationDate(user.getExpirationDate())
                .isAdmin(user.getIsAdmin())
                .build();

        String token = jwtUtil.generateToken(payload);

        // Lưu token vào Redis
        redisTemplate.opsForValue().set(token, "valid", Duration.ofMillis(86400000)); // 1 ngày

        // Response
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "username", user.getUsername(),
                "isAdmin", user.getIsAdmin()
        ));

        return response;
    }




}
