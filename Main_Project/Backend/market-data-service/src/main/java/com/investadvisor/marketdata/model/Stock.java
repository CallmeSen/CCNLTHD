package com.investadvisor.marketdata.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Master record for a Vietnamese stock listed on HOSE/HNX.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "stocks", indexes = {
        @Index(name = "idx_stock_ticker", columnList = "ticker", unique = true),
        @Index(name = "idx_stock_exchange", columnList = "exchange")
})
public class Stock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** E.g. VCB, FPT, VHM */
    @Column(nullable = false, unique = true, length = 10)
    private String ticker;

    @Column(nullable = false, length = 200)
    private String companyName;

    /** HOSE, HNX, UPCOM */
    @Column(nullable = false, length = 10)
    private String exchange;

    /** ICB sector code */
    @Column(length = 50)
    private String sector;

    @Column(length = 50)
    private String industry;

    /** Current market cap in VND */
    private Long marketCapVnd;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
