package com.investadvisor.marketdata.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Maps the TradingView-style response from the TCBS public index chart API.
 *
 * <pre>
 * GET https://apipubaws.tcbs.com.vn/stock-insight/v1/index/chart
 *     ?indexId=VNINDEX&type=stickChart&resolution=D&from=<epoch>&to=<epoch>
 * </pre>
 *
 * All price fields are parallel arrays — element [i] belongs to timestamp[i].
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TcbsIndexResponse(
        @JsonProperty("t") List<Long>   timestamps,
        @JsonProperty("o") List<Double> open,
        @JsonProperty("h") List<Double> high,
        @JsonProperty("l") List<Double> low,
        @JsonProperty("c") List<Double> close,
        @JsonProperty("v") List<Long>   volume
) {
    /** Returns true when the response contains at least one data point. */
    public boolean hasData() {
        return timestamps != null && !timestamps.isEmpty();
    }
}
