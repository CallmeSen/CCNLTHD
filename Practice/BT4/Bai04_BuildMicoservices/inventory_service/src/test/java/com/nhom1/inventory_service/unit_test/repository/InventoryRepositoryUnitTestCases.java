package com.nhom1.inventory_service.unit_test.repository;

import com.nhom1.inventory_service.model.Inventory;
import com.nhom1.inventory_service.repository.InventoryRepo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Unit - Repository layer")
@DataJpaTest
public abstract class InventoryRepositoryUnitTestCases {

    @Autowired
    private InventoryRepo inventoryRepo;

    @Test
    @DisplayName("UT-13 should query inventory by multiple sku codes")
    void shouldQueryByMultipleSkuCodes() {
    inventoryRepo.saveAll(List.of(
        Inventory.builder().skuCode("iphone_13").quantity(10).build(),
        Inventory.builder().skuCode("iphone_13_red").quantity(0).build(),
        Inventory.builder().skuCode("samsung_s23").quantity(7).build()
    ));

    List<Inventory> result = inventoryRepo.findAllBySkuCodeIn(List.of("iphone_13", "samsung_s23"));

    assertThat(result).hasSize(2);
    assertThat(result).extracting(Inventory::getSkuCode)
        .containsExactlyInAnyOrder("iphone_13", "samsung_s23");
    }

    @Test
    @DisplayName("UT-14 should return empty result for non existing sku")
    void shouldReturnEmptyWhenSkuDoesNotExist() {
    inventoryRepo.saveAll(List.of(
        Inventory.builder().skuCode("iphone_13").quantity(10).build(),
        Inventory.builder().skuCode("iphone_13_red").quantity(0).build()
    ));

    List<Inventory> result = inventoryRepo.findAllBySkuCodeIn(List.of("nokia_3310"));

    assertThat(result).isEmpty();
    }
}
