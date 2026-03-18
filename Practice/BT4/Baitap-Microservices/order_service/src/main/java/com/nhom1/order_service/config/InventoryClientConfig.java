package com.nhom1.order_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class InventoryClientConfig {

    @Bean
    public RestClient inventoryRestClient(
            @Value("${inventory.service.base-url:http://localhost:8080}") String inventoryBaseUrl) {
        return RestClient.builder()
                .baseUrl(inventoryBaseUrl)
                .build();
    }
}
