package com.investadvisor.portfolio.repository;

import com.investadvisor.portfolio.model.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PortfolioRepository extends JpaRepository<Portfolio, UUID> {
    List<Portfolio> findByUserIdAndActiveTrue(UUID userId);
    Optional<Portfolio> findByIdAndUserId(UUID id, UUID userId);
}
