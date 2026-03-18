package com.nhom1.inventory_service.service;

import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import com.nhom1.inventory_service.dto.BaseResponse;
import com.nhom1.inventory_service.dto.InventoryDTO;
import com.nhom1.inventory_service.model.Inventory;
import com.nhom1.inventory_service.repository.InventoryMapper;
import com.nhom1.inventory_service.repository.InventoryRepo;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {
    private final InventoryRepo inventoryRepo;
    private final InventoryMapper inventoryMapper;

    public List<BaseResponse> checkStock(List<String> skuCodes) {
        Map<String, Inventory> inventoryBySku = inventoryRepo.findAllBySkuCodeIn(skuCodes)
                .stream()
                .collect(Collectors.toMap(Inventory::getSkuCode, Function.identity()));

        return skuCodes.stream()
                .map(sku -> {
                    Inventory inventory = inventoryBySku.get(sku);
                    if (inventory == null) {
                        return BaseResponse.builder()
                                .skuCode(sku)
                                .isInStock(false)
                                .quantity(0)
                                .build();
                    }

                    return BaseResponse.builder()
                            .skuCode(sku)
                            .isInStock(inventory.getQuantity() > 0)
                            .quantity(inventory.getQuantity())
                            .build();
                })
                .collect(Collectors.toList());
    }

    public InventoryDTO createInventory(InventoryDTO inventoryDTO) {
        Inventory inventory = inventoryMapper.toEntity(inventoryDTO);
        Inventory savedInventory = inventoryRepo.save(inventory);
        return inventoryMapper.toDTO(savedInventory);
    }

    public Optional<InventoryDTO> getInventoryBySkuCode(String skuCode) {
        return inventoryRepo.findBySkuCode(skuCode)
                .map(inventoryMapper::toDTO);
    }

    public boolean checkStock(String skuCode) {
        return inventoryRepo.existsBySkuCode(skuCode);
    }

    public int getQuantityBySkuCode(String skuCode) {
        return inventoryRepo.findBySkuCode(skuCode)
                .map(Inventory::getQuantity)
                .orElse(0);
    }

    public boolean updateStock(String skuCode, int quantityOrdered) {
        return inventoryRepo.findBySkuCode(skuCode)
                .map(inventory -> {
                    if (inventory.getQuantity() >= quantityOrdered) {
                        inventory.setQuantity(inventory.getQuantity() - quantityOrdered);
                        inventoryRepo.save(inventory);
                        return true;
                    } else {
                        return false;
                    }
                }).orElse(false);
    }

}
