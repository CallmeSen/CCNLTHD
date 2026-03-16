package vn.hdbank.intern.inventoryservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.mapstruct.Mapper;
import vn.hdbank.intern.inventoryservice.model.Inventory;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class InventoryDTO {

    private String skuCode;
    private Integer quantity;
}
