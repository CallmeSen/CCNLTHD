package com.investadvisor.marketdata.dto;

import com.investadvisor.marketdata.model.Stock;

public record StockDto(
        Long id,
        String ticker,
        String companyName,
        String exchange,
        String sector,
        String industry,
        Long marketCapVnd,
        boolean active
) {
    public static StockDto from(Stock s) {
        return new StockDto(s.getId(), s.getTicker(), s.getCompanyName(),
                s.getExchange(), s.getSector(), s.getIndustry(),
                s.getMarketCapVnd(), s.isActive());
    }

    public record CreateRequest(
            String ticker,
            String companyName,
            String exchange,
            String sector,
            String industry,
            Long marketCapVnd
    ) {
        public Stock toEntity() {
            Stock s = new Stock();
            s.setTicker(ticker);
            s.setCompanyName(companyName);
            s.setExchange(exchange);
            s.setSector(sector);
            s.setIndustry(industry);
            s.setMarketCapVnd(marketCapVnd);
            s.setActive(true);
            return s;
        }
    }
}
