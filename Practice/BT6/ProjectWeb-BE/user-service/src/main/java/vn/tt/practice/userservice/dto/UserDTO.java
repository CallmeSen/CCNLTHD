package vn.tt.practice.userservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;

@Data
@Builder
public class UserDTO {
    private String id;

    @NotBlank(message = "Username cannot be blank")
    private String username;

    @Email(message = "Email not valid")
    @NotBlank(message = "Email cannot be blank")
    private String email;

    @Size(min = 6, message = "Password must be at least 6 char")
    private String password;

    private Boolean isAdmin;

    private int expirationDate;

//    @Enumerated(EnumType.STRING)
//    @Column(nullable = false)
//    private Role role;


}
