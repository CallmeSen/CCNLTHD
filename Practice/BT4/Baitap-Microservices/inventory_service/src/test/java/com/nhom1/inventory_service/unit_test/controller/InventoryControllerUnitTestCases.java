package com.nhom1.inventory_service.unit_test.controller;

import com.nhom1.inventory_service.controller.InventoryController;
import com.nhom1.inventory_service.dto.BaseResponse;
import com.nhom1.inventory_service.service.InventoryService;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Unit - Controller layer")
@WebMvcTest(InventoryController.class)
public abstract class InventoryControllerUnitTestCases {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InventoryService inventoryService;

    @Test
    @DisplayName("UT-09 should parse multi skuCode query params")
    void shouldParseMultipleSkuCodeQueryParams() throws Exception {
    when(inventoryService.checkStock(List.of("iphone_13", "samsung_s23")))
        .thenReturn(List.of(
            BaseResponse.builder().skuCode("iphone_13").isInStock(true).quantity(10).build(),
            BaseResponse.builder().skuCode("samsung_s23").isInStock(true).quantity(7).build()
        ));

    mockMvc.perform(get("/api/inventory")
            .param("skuCode", "iphone_13", "samsung_s23"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].skuCode").value("iphone_13"))
        .andExpect(jsonPath("$[0].inStock").value(true))
        .andExpect(jsonPath("$[1].skuCode").value("samsung_s23"))
        .andExpect(jsonPath("$[1].inStock").value(true));
    }

    @Test
    @DisplayName("UT-10 should return 400 when skuCode query param is missing")
    void shouldReturnBadRequestWhenSkuCodeParamMissing() throws Exception {
    mockMvc.perform(get("/api/inventory"))
        .andExpect(status().isBadRequest());

    verify(inventoryService, never()).checkStock(anyList());
    }

    @Test
    @Disabled("Business decision: blank skuCode is currently accepted")
    @DisplayName("UT-11 should return 400 when skuCode is blank")
    void shouldReturnBadRequestWhenSkuCodeBlank() throws Exception {
    mockMvc.perform(get("/api/inventory")
            .param("skuCode", ""))
        .andExpect(status().isBadRequest());

    verify(inventoryService, never()).checkStock(anyList());
    }

    @Test
    @DisplayName("UT-12 should return application json content type")
    void shouldReturnApplicationJsonContentType() throws Exception {
    when(inventoryService.checkStock(List.of("iphone_13")))
        .thenReturn(List.of(BaseResponse.builder().skuCode("iphone_13").isInStock(true).quantity(10).build()));

    mockMvc.perform(get("/api/inventory")
            .param("skuCode", "iphone_13"))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith("application/json"));
    }
}
