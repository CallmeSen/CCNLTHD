package com.nhom1.inventory_service.integration_test.api;

import com.nhom1.inventory_service.model.Inventory;
import com.nhom1.inventory_service.repository.InventoryRepo;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Integration - API and database")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class InventoryApiIntegrationTestCases {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private InventoryRepo inventoryRepo;

    private void seedDefaultInventoryData() {
        inventoryRepo.deleteAll();
        inventoryRepo.saveAll(List.of(
                Inventory.builder().skuCode("iphone_13").quantity(10).build(),
                Inventory.builder().skuCode("iphone_13_red").quantity(0).build(),
                Inventory.builder().skuCode("samsung_s23").quantity(5).build()
        ));
    }

    @Test
    @DisplayName("IT-01 should return in stock true for existing sku with quantity greater than zero")
    void shouldReturnInStockTrueForExistingSku() throws Exception {
        seedDefaultInventoryData();

        mockMvc.perform(get("/api/inventory").param("skuCode", "iphone_13"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].skuCode").value("iphone_13"))
                .andExpect(jsonPath("$[0].inStock").value(true));
    }

    @Test
    @DisplayName("IT-02 should return in stock false for existing sku with zero quantity")
    void shouldReturnInStockFalseForZeroQuantitySku() throws Exception {
        seedDefaultInventoryData();

        mockMvc.perform(get("/api/inventory").param("skuCode", "iphone_13_red"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].skuCode").value("iphone_13_red"))
                .andExpect(jsonPath("$[0].inStock").value(false));
    }

    @Test
    @DisplayName("IT-03 should return in stock false for non existing sku")
    void shouldReturnInStockFalseForNonExistingSku() throws Exception {
        seedDefaultInventoryData();

        mockMvc.perform(get("/api/inventory").param("skuCode", "nokia_3310"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].skuCode").value("nokia_3310"))
                .andExpect(jsonPath("$[0].inStock").value(false));
    }

    @Test
    @DisplayName("IT-04 should support checking stock for multiple sku values")
    void shouldSupportMultipleSkuInOneRequest() throws Exception {
        seedDefaultInventoryData();

        mockMvc.perform(get("/api/inventory")
                        .param("skuCode", "iphone_13", "iphone_13_red", "nokia_3310"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].skuCode").value("iphone_13"))
                .andExpect(jsonPath("$[0].inStock").value(true))
                .andExpect(jsonPath("$[1].skuCode").value("iphone_13_red"))
                .andExpect(jsonPath("$[1].inStock").value(false))
                .andExpect(jsonPath("$[2].skuCode").value("nokia_3310"))
                .andExpect(jsonPath("$[2].inStock").value(false));
    }

    @Test
    @DisplayName("IT-05 should return 400 when skuCode query param is missing")
    void shouldReturnBadRequestWhenSkuCodeMissing() throws Exception {
        mockMvc.perform(get("/api/inventory"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Disabled("Business decision: blank skuCode is currently accepted")
    @DisplayName("IT-06 should return 400 when skuCode value is blank")
    void shouldReturnBadRequestWhenSkuCodeBlank() throws Exception {
        mockMvc.perform(get("/api/inventory").param("skuCode", ""))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Disabled("Requires fault injection setup to force database outage at runtime")
    @DisplayName("IT-07 should return 5xx and expose useful logs on database connection failure")
    void shouldReturnServerErrorWhenDatabaseUnavailable() {
    }

    @Test
    @DisplayName("IT-12 should return response contract with skuCode and isInStock fields")
    void shouldMatchResponseContract() throws Exception {
        seedDefaultInventoryData();

        mockMvc.perform(get("/api/inventory")
                        .param("skuCode", "iphone_13", "iphone_13_red"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].skuCode").isString())
                .andExpect(jsonPath("$[0].inStock").isBoolean())
                .andExpect(jsonPath("$[1].skuCode").isString())
                .andExpect(jsonPath("$[1].inStock").isBoolean());
    }

    @Test
    @DisplayName("IT-13 should pass baseline load test for inventory endpoint")
    void shouldPassBaselineLoadTest() throws Exception {
        seedDefaultInventoryData();

        for (int i = 0; i < 100; i++) {
            mockMvc.perform(get("/api/inventory").param("skuCode", "iphone_13"))
                    .andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("IT-15 should keep public endpoint behavior when auth is not enabled")
    void shouldKeepPublicBehaviorWhenAuthDisabled() throws Exception {
        seedDefaultInventoryData();

        mockMvc.perform(get("/api/inventory").param("skuCode", "iphone_13"))
                .andExpect(status().isOk());
    }
}
