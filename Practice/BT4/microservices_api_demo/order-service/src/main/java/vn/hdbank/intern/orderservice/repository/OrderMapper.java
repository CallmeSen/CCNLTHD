package vn.hdbank.intern.orderservice.repository;

import org.mapstruct.Mapper;
import org.springframework.data.domain.jaxb.SpringDataJaxb;
import vn.hdbank.intern.orderservice.dto.OrderDTO;
import vn.hdbank.intern.orderservice.model.Order;

@Mapper(componentModel = "spring")
public interface OrderMapper {
//    public static OrderDTO toDTO(Order entity) {
//        return OrderDTO.builder()
//                .id(entity.getId())
//                .orderNumber(entity.getOrderNumber())
//                .build();
//    }
//
//    public static Order toEntity(OrderDTO dto) {
//        return Order.builder()
//                .id(dto.getId())
//                .orderNumber(dto.getOrderNumber())
//                .build();
//    }

    OrderDTO toDTO(Order order);
    Order toEntity(OrderDTO orderDTO);
}
