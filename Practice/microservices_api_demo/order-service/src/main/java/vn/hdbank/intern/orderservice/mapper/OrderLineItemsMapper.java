package vn.hdbank.intern.orderservice.mapper;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import vn.hdbank.intern.orderservice.dto.OrderLineItemsDTO;
import vn.hdbank.intern.orderservice.model.Order;
import vn.hdbank.intern.orderservice.model.OrderLineItems;

//@Mapper(componentModel = "spring")
@Component
@RequiredArgsConstructor
public class OrderLineItemsMapper {
//    OrderLineItemsDTO toDTO(OrderLineItems entity);
//
//    OrderLineItems toEntity(OrderLineItemsDTO dto);

    public OrderLineItemsDTO toDTO(OrderLineItems orderLineItems) {
        if (orderLineItems == null) {
            return null;
        }
        return new OrderLineItemsDTO(
                orderLineItems.getId(),
                orderLineItems.getSkuCode(),
                orderLineItems.getPrice(),
                orderLineItems.getQuantity()
        );
    }

    public OrderLineItems toEntity(OrderLineItemsDTO orderLineItemsDTO) {
        if (orderLineItemsDTO == null) {
            return null;
        }
        return OrderLineItems.builder()
                .id(orderLineItemsDTO.getId())
                .skuCode(orderLineItemsDTO.getSkuCode())
                .price(orderLineItemsDTO.getPrice())
                .quantity(orderLineItemsDTO.getQuantity())
                .build();
    }

}
