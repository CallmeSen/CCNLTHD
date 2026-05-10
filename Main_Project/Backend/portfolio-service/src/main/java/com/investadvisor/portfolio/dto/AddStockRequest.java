package com.investadvisor.portfolio.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AddStockRequest(
        @NotBlank @Size(max = 10) String ticker,
        @Min(0) long quantity,
        @DecimalMin("0") BigDecimal avgPrice
) {
    public AddStockRequest {
        if (quantity < 0) quantity = 0;
        if (avgPrice == null || avgPrice.compareTo(BigDecimal.ZERO) < 0) avgPrice = BigDecimal.ZERO;
    }
}
