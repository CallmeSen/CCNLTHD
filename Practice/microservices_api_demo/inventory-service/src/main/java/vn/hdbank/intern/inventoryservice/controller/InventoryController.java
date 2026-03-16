package vn.hdbank.intern.inventoryservice.controller;

import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.hdbank.intern.inventoryservice.dto.BaseResponse;
import vn.hdbank.intern.inventoryservice.model.Inventory;
import vn.hdbank.intern.inventoryservice.repository.InventoryRepo;
import vn.hdbank.intern.inventoryservice.service.InventoryService;


@Slf4j
@RestController
@RequestMapping("/v1/api/inventory")
@RequiredArgsConstructor
public class InventoryController {
    private final InventoryService inventoryService;
    private final InventoryRepo inventoryRepo;

    @GetMapping("")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<BaseResponse> isInStock(@RequestParam String skuCode) {
        if(inventoryService.checkStock(skuCode)) {
            log.info("Inventory found with SKU {}", skuCode);
            return ResponseEntity.ok().body(BaseResponse.builder()
                    .skuCode(skuCode)
                    .isInStock(true)
                    .quantity(inventoryService.getQuantityBySkuCode(skuCode))
                    .build());
        }else {
            log.info("Inventory not found with SKU {}", skuCode);
            return ResponseEntity.ok().body(BaseResponse.builder()
                    .skuCode(skuCode)
                    .isInStock(false)
                    .build());
        }
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


}
