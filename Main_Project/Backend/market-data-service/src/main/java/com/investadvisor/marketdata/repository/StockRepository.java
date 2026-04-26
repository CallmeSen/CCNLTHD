package com.investadvisor.marketdata.repository;

import com.investadvisor.marketdata.model.Stock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StockRepository extends JpaRepository<Stock, Long> {

    Optional<Stock> findByTicker(String ticker);

    List<Stock> findByExchange(String exchange);

    List<Stock> findByActiveTrue();

    boolean existsByTicker(String ticker);
}
