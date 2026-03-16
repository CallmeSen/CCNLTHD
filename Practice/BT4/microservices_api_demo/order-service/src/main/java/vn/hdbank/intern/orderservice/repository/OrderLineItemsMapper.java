package vn.hdbank.intern.orderservice.repository;

import org.mapstruct.Mapper;
import vn.hdbank.intern.orderservice.dto.OrderLineItemsDTO;
import vn.hdbank.intern.orderservice.model.OrderLineItems;

@Mapper(componentModel = "spring")
public interface OrderLineItemsMapper {
    OrderLineItemsDTO toDTO(OrderLineItems entity);

    OrderLineItems toEntity(OrderLineItemsDTO dto);

}
