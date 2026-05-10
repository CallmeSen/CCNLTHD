package com.investadvisor.portfolio.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A single ticker that the user holds inside a portfolio.
 * Stores optional quantity and average cost so MPT analytics can be computed.
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

    /** Number of shares held (0 = watchlist-only, no quantity tracked). */
    @Column(nullable = false)
    @Builder.Default
    private Long quantity = 0L;

    /** Average purchase price in VND (0 if not tracked). */
    @Column(name = "avg_price", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal avgPrice = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime addedAt;
}
