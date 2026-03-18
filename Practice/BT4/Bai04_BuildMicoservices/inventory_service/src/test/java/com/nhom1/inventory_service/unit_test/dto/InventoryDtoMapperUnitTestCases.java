package com.nhom1.inventory_service.unit_test.dto;

import com.nhom1.inventory_service.dto.InventoryDTO;
import com.nhom1.inventory_service.model.Inventory;
import com.nhom1.inventory_service.repository.InventoryMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Unit - DTO and mapper layer")
public abstract class InventoryDtoMapperUnitTestCases {

    private InventoryMapper inventoryMapper;

    @BeforeEach
    void setUpMapper() {
        inventoryMapper = Mappers.getMapper(InventoryMapper.class);
    }

    @Test
    @DisplayName("UT-15 should map inventory entity to response dto correctly")
    void shouldMapEntityToResponseDtoCorrectly() {
        Inventory inventory = Inventory.builder()
                .id(1L)
                .skuCode("iphone_13")
                .quantity(10)
                .build();

        InventoryDTO dto = inventoryMapper.toDTO(inventory);

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getSkuCode()).isEqualTo("iphone_13");
        assertThat(dto.getQuantity()).isEqualTo(10);
    }
}
