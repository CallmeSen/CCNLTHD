package com.investadvisor.user.kafka.events;

import com.investadvisor.user.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserEvent {
    private String eventType;
    private UUID userId;
    private String email;
    private String fullName;
    private String role;
    private Instant occurredAt;

    public static UserEvent of(String eventType, User user) {
        return new UserEvent(
                eventType,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                Instant.now()
        );
    }
}
