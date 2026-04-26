package com.investadvisor.portfolio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddStockRequest(@NotBlank @Size(max = 10) String ticker) {}
