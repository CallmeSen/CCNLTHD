package com.investadvisor.portfolio.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * A single ticker that the user wants to track inside a portfolio.
 * No quantities or cost-basis — this is a watchlist for AI analysis.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "watchlist_items",
        uniqueConstraints = @UniqueConstraint(name = "uq_portfolio_ticker", columnNames = {"portfolio_id", "ticker"}),
        indexes = @Index(name = "idx_watchlist_portfolio", columnList = "portfolio_id"))
public class WatchlistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "portfolio_id", nullable = false)
    private Portfolio portfolio;

    @Column(nullable = false, length = 10)
    private String ticker;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime addedAt;
}
