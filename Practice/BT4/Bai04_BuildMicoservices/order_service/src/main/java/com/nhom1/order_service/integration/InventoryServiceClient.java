package com.nhom1.order_service.integration;

import com.nhom1.order_service.exception.InventoryServiceUnavailableException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class InventoryServiceClient {

    private final RestClient inventoryRestClient;
    private final String inStockPath;

    public InventoryServiceClient(
            RestClient inventoryRestClient,
            @Value("${inventory.service.in-stock-path:/api/inventory}") String inStockPath) {
        this.inventoryRestClient = inventoryRestClient;
        this.inStockPath = inStockPath;
    }

    @CircuitBreaker(name = "inventoryService", fallbackMethod = "inventoryFallback")
    @Retry(name = "inventoryService")
    @TimeLimiter(name = "inventoryService")
    public CompletableFuture<Boolean> isInStock(String skuCode, int requestedQuantity) {
        return CompletableFuture.supplyAsync(() -> {
            Object responseBody = inventoryRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(inStockPath)
                            .queryParam("skuCode", skuCode)
                            .build())
                    .retrieve()
                    .body(Object.class);

            return parseInStock(responseBody, requestedQuantity);
        });
    }

    private CompletableFuture<Boolean> inventoryFallback(String skuCode, int requestedQuantity, Throwable throwable) {
        CompletableFuture<Boolean> failedFuture = new CompletableFuture<>();
        failedFuture.completeExceptionally(new InventoryServiceUnavailableException(
                "Inventory service is unavailable for skuCode: " + skuCode,
                throwable));
        return failedFuture;
    }

    private boolean parseInStock(Object body, int requestedQuantity) {
        if (body == null) {
            return false;
        }

        if (body instanceof Boolean value) {
            return value;
        }

        if (body instanceof Map<?, ?> map) {
            Object inStockValue = map.containsKey("inStock")
                    ? map.get("inStock")
                    : map.get("isInStock");
            if (inStockValue instanceof Boolean inStockFlag && !inStockFlag) {
                return false;
            }

            Object quantityValue = map.get("quantity");
            if (quantityValue instanceof Number quantityNumber) {
                return quantityNumber.intValue() >= requestedQuantity;
            }

            if (inStockValue instanceof Boolean inStockFlag) {
                return inStockFlag;
            }
        }

        return false;
    }
}
