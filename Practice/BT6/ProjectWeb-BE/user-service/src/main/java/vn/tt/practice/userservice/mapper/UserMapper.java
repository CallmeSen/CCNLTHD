package vn.tt.practice.userservice.mapper;

import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import vn.tt.practice.userservice.dto.UserDTO;
import vn.tt.practice.userservice.model.User;

@Component
public class UserMapper {

    public User toEntity(UserDTO userDTO) {
        return User.builder()
                .id(userDTO.getId())
                .username(userDTO.getUsername())
                .email(userDTO.getEmail())
                .password(userDTO.getPassword())
                .isAdmin(userDTO.getIsAdmin())
                .expirationDate(userDTO.getExpirationDate())
                .build();
    }

    public UserDTO toDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .password(user.getPassword())
                .isAdmin(user.getIsAdmin())
                .expirationDate(user.getExpirationDate())
                .build();
    }

}
