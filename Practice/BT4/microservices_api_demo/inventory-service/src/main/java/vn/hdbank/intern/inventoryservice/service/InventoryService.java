package vn.hdbank.intern.inventoryservice.service;

import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import vn.hdbank.intern.inventoryservice.model.Inventory;
import vn.hdbank.intern.inventoryservice.repository.InventoryRepo;

import java.util.Optional;


@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {
    private final InventoryRepo inventoryRepo;
    private final RestTemplate restTemplate;
    private final RedisTemplate<String, Object> redisTemplate;


//    public List<BaseResponse> isInStock(List<String> skuCodes) {
//        return skuCodes.stream()
//                .map(sku -> {
//                    boolean isInStock = inventoryRepo.findBySkuCode(sku)
//                            .map(inventory -> inventory.getQuantity() > 0)
//                            .orElse(false);
//                    return new BaseResponse(sku, isInStock);
//                })
//                .collect(Collectors.toList());
//    }


//    public InventoryDTO saveOrderLineItems(InventoryDTO inventoryDTO) {
//        return inventoryMapper.toDTO(inventoryRepo.save(inventoryMapper.toEntity(inventoryDTO)));
//    }

//    @Cacheable(value = "inventory", key = "#skuCode")
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
