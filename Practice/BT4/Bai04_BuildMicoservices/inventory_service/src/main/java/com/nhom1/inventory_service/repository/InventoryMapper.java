package com.nhom1.inventory_service.repository;

import org.mapstruct.Mapper;
import com.nhom1.inventory_service.dto.InventoryDTO;
import com.nhom1.inventory_service.model.Inventory;

import java.util.List;

@Mapper(componentModel = "spring")
public interface InventoryMapper {
	InventoryDTO toDTO(Inventory inventory);

	Inventory toEntity(InventoryDTO inventoryDTO);

	List<InventoryDTO> toDTOList(List<Inventory> inventories);

	List<Inventory> toEntityList(List<InventoryDTO> inventoryDTOs);
}
