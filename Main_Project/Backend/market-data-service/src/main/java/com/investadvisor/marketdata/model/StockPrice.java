package com.investadvisor.marketdata.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Time-series price bar for a stock.
 *
 * NOTE: In production, migrate this table to a TimescaleDB hypertable:
 *   SELECT create_hypertable('stock_prices', 'timestamp');
 * TimescaleDB is a PostgreSQL extension — same JDBC driver, just better
 * performance for billions of time-ordered rows.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "stock_prices", indexes = {
        @Index(name = "idx_price_stock_ts", columnList = "stock_id, timestamp"),
        @Index(name = "idx_price_ticker_ts", columnList = "ticker, timestamp")
})
public class StockPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_id", nullable = false)
    private Stock stock;

    /** Denormalised for faster time-range queries without join. */
    @Column(nullable = false, length = 10)
    private String ticker;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(precision = 18, scale = 2)
    private BigDecimal open;

    @Column(precision = 18, scale = 2)
    private BigDecimal high;

    @Column(precision = 18, scale = 2)
    private BigDecimal low;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal close;

    private Long volume;

    /** Granularity: 1MIN, 5MIN, 15MIN, 1H, 1D */
    @Column(nullable = false, length = 10)
    private String interval;
}
