package com.nhom1.inventory_service.repository;

import com.nhom1.inventory_service.dto.InventoryDTO;
import com.nhom1.inventory_service.model.Inventory;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-22T15:40:19+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.8 (Eclipse Adoptium)"
)
@Component
public class InventoryMapperImpl implements InventoryMapper {

    @Override
    public InventoryDTO toDTO(Inventory inventory) {
        if ( inventory == null ) {
            return null;
        }

        InventoryDTO.InventoryDTOBuilder inventoryDTO = InventoryDTO.builder();

        inventoryDTO.id( inventory.getId() );
        inventoryDTO.skuCode( inventory.getSkuCode() );
        inventoryDTO.quantity( inventory.getQuantity() );

        return inventoryDTO.build();
    }

    @Override
    public Inventory toEntity(InventoryDTO inventoryDTO) {
        if ( inventoryDTO == null ) {
            return null;
        }

        Inventory.InventoryBuilder inventory = Inventory.builder();

        inventory.id( inventoryDTO.getId() );
        inventory.skuCode( inventoryDTO.getSkuCode() );
        inventory.quantity( inventoryDTO.getQuantity() );

        return inventory.build();
    }

    @Override
    public List<InventoryDTO> toDTOList(List<Inventory> inventories) {
        if ( inventories == null ) {
            return null;
        }

        List<InventoryDTO> list = new ArrayList<InventoryDTO>( inventories.size() );
        for ( Inventory inventory : inventories ) {
            list.add( toDTO( inventory ) );
        }

        return list;
    }

    @Override
    public List<Inventory> toEntityList(List<InventoryDTO> inventoryDTOs) {
        if ( inventoryDTOs == null ) {
            return null;
        }

        List<Inventory> list = new ArrayList<Inventory>( inventoryDTOs.size() );
        for ( InventoryDTO inventoryDTO : inventoryDTOs ) {
            list.add( toEntity( inventoryDTO ) );
        }

        return list;
    }
}
