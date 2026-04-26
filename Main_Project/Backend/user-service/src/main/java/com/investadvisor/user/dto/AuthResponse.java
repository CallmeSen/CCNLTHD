package com.investadvisor.user.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserDto user
) {
    public static AuthResponse of(String token, long expiresIn, UserDto user) {
        return new AuthResponse(token, "Bearer", expiresIn, user);
    }
}
