package com.investadvisor.portfolio.dto;

import com.investadvisor.portfolio.model.RiskProfile;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreatePortfolioRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 300) String description,
        @NotNull RiskProfile riskProfile
) {}
