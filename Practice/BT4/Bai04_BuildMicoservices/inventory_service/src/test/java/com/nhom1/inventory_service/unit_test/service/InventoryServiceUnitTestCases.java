package com.nhom1.inventory_service.unit_test.service;

import com.nhom1.inventory_service.dto.BaseResponse;
import com.nhom1.inventory_service.model.Inventory;
import com.nhom1.inventory_service.repository.InventoryMapper;
import com.nhom1.inventory_service.repository.InventoryRepo;
import com.nhom1.inventory_service.service.InventoryService;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@DisplayName("Unit - Service layer")
@ExtendWith(MockitoExtension.class)
public abstract class InventoryServiceUnitTestCases {

    @Mock
    private InventoryRepo inventoryRepo;

    @Mock
    private InventoryMapper inventoryMapper;

    @InjectMocks
    private InventoryService inventoryService;

    @Test
    @DisplayName("UT-01 should return in stock true for sku with quantity greater than zero")
    void shouldReturnInStockTrueWhenQuantityGreaterThanZero() {
    when(inventoryRepo.findAllBySkuCodeIn(List.of("iphone_13")))
        .thenReturn(List.of(Inventory.builder().skuCode("iphone_13").quantity(10).build()));

    List<BaseResponse> result = inventoryService.checkStock(List.of("iphone_13"));

    assertThat(result).hasSize(1);
    assertThat(result.get(0).getSkuCode()).isEqualTo("iphone_13");
    assertThat(result.get(0).isInStock()).isTrue();
    assertThat(result.get(0).getQuantity()).isEqualTo(10);
    }

    @Test
    @DisplayName("UT-02 should return in stock false for sku with quantity equal zero")
    void shouldReturnInStockFalseWhenQuantityEqualsZero() {
    when(inventoryRepo.findAllBySkuCodeIn(List.of("iphone_13_red")))
        .thenReturn(List.of(Inventory.builder().skuCode("iphone_13_red").quantity(0).build()));

    List<BaseResponse> result = inventoryService.checkStock(List.of("iphone_13_red"));

    assertThat(result).hasSize(1);
    assertThat(result.get(0).getSkuCode()).isEqualTo("iphone_13_red");
    assertThat(result.get(0).isInStock()).isFalse();
    assertThat(result.get(0).getQuantity()).isZero();
    }

    @Test
    @DisplayName("UT-03 should return in stock false when sku does not exist")
    void shouldReturnInStockFalseWhenSkuNotFound() {
    when(inventoryRepo.findAllBySkuCodeIn(List.of("nokia_3310"))).thenReturn(List.of());

    List<BaseResponse> result = inventoryService.checkStock(List.of("nokia_3310"));

    assertThat(result).hasSize(1);
    assertThat(result.get(0).getSkuCode()).isEqualTo("nokia_3310");
    assertThat(result.get(0).isInStock()).isFalse();
    assertThat(result.get(0).getQuantity()).isZero();
    }

    @Test
    @DisplayName("UT-04 should return mixed stock statuses for mixed sku list")
    void shouldReturnMixedStatusForMixedSkuList() {
    when(inventoryRepo.findAllBySkuCodeIn(anyList()))
        .thenReturn(List.of(
            Inventory.builder().skuCode("iphone_13").quantity(5).build(),
            Inventory.builder().skuCode("iphone_13_red").quantity(0).build()
        ));

    List<BaseResponse> result = inventoryService.checkStock(List.of("iphone_13", "iphone_13_red", "nokia_3310"));

    assertThat(result).hasSize(3);
    assertThat(result).extracting(BaseResponse::getSkuCode)
        .containsExactly("iphone_13", "iphone_13_red", "nokia_3310");
    assertThat(result).extracting(BaseResponse::isInStock)
        .containsExactly(true, false, false);
    assertThat(result).extracting(BaseResponse::getQuantity)
        .containsExactly(5, 0, 0);
    }

    @Test
    @DisplayName("UT-05 should preserve response order by input sku list")
    void shouldPreserveResponseOrderByInputList() {
    when(inventoryRepo.findAllBySkuCodeIn(anyList()))
        .thenReturn(List.of(
            Inventory.builder().skuCode("iphone_13").quantity(3).build(),
            Inventory.builder().skuCode("samsung_s23").quantity(2).build()
        ));

    List<BaseResponse> result = inventoryService.checkStock(List.of("samsung_s23", "nokia_3310", "iphone_13"));

    assertThat(result).extracting(BaseResponse::getSkuCode)
        .containsExactly("samsung_s23", "nokia_3310", "iphone_13");
    }

    @Test
    @Disabled("Temporarily skipped by QA decision: empty sku list validation is out of current scope")
    @DisplayName("UT-06 should fail validation for empty sku list")
    void shouldFailValidationForEmptySkuList() {
    // Re-enable when service contract requires rejecting empty sku list.
    assertThatThrownBy(() -> inventoryService.checkStock(List.of()))
        .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @Disabled("Temporarily skipped by QA decision: null sku validation is out of current scope")
    @DisplayName("UT-07 should fail validation when sku contains null")
    void shouldFailValidationWhenSkuContainsNull() {
        // Re-enable when service contract requires rejecting null sku values.
        List<String> skuCodes = new ArrayList<>();
        skuCodes.add("iphone_13");
        skuCodes.add(null);

        assertThatThrownBy(() -> inventoryService.checkStock(skuCodes))
        .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @Disabled("Business decision: blank skuCode is currently accepted")
    @DisplayName("UT-08 should fail validation for blank sku value")
    void shouldFailValidationForBlankSkuValue() {
    assertThatThrownBy(() -> inventoryService.checkStock(List.of("iphone_13", "   ")))
        .isInstanceOf(IllegalArgumentException.class);
    }
}
