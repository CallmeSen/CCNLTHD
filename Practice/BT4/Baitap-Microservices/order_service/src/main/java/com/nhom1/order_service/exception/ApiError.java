package com.nhom1.order_service.exception;

import java.time.Instant;
import java.util.Map;

public class ApiError {

    private final String code;
    private final String message;
    private final Instant timestamp;
    private final Map<String, String> details;

    public ApiError(String code, String message, Map<String, String> details) {
        this.code = code;
        this.message = message;
        this.details = details;
        this.timestamp = Instant.now();
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public Map<String, String> getDetails() {
        return details;
    }
}
