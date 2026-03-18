package com.nhom1.inventory_service.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.nhom1.inventory_service.dto.BaseResponse;
import com.nhom1.inventory_service.dto.InventoryDTO;
import com.nhom1.inventory_service.service.InventoryService;

import java.util.List;


@Slf4j
@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {
    private final InventoryService inventoryService;

    @GetMapping("")
    @ResponseStatus(HttpStatus.OK)
    public ResponseEntity<List<BaseResponse>> isInStock(@RequestParam List<String> skuCode) {
        List<BaseResponse> responses = inventoryService.checkStock(skuCode);
        log.info("Inventory check completed for {} SKU(s)", skuCode.size());
        return ResponseEntity.ok(responses);
    }

    @PutMapping("/updateStock")
    public ResponseEntity<String> updateStock(@RequestParam String skuCode, @RequestParam int quantity) {
        boolean updated = inventoryService.updateStock(skuCode, quantity);
        if (updated) {
            return ResponseEntity.ok("Stock updated successfully for SKU: " + skuCode);
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed to update stock for SKU: " + skuCode);
        }
    }

    @PostMapping
    public ResponseEntity<InventoryDTO> createInventory(@RequestBody InventoryDTO inventoryDTO) {
        InventoryDTO createdInventory = inventoryService.createInventory(inventoryDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdInventory);
    }

    @GetMapping("/detail")
    public ResponseEntity<InventoryDTO> getInventoryDetail(@RequestParam String skuCode) {
        return inventoryService.getInventoryBySkuCode(skuCode)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }


}
