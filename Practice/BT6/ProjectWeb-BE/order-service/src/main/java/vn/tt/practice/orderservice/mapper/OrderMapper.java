package vn.tt.practice.orderservice.mapper;

import org.springframework.stereotype.Component;
import vn.tt.practice.orderservice.dto.Payload;
import vn.tt.practice.orderservice.model.Order;
import vn.tt.practice.orderservice.model.PaymentMethod;

@Component
public class OrderMapper {
    public Order toEntity(Payload orderDTO) {
        return Order.builder()
                .id(orderDTO.getId())
                .items(orderDTO.getItems())
                .contact_number(orderDTO.getContact_number())
                .cost_after_delivery_rate(orderDTO.getCost_after_delivery_rate())
                .cost_before_delivery_rate(orderDTO.getCost_before_delivery_rate())
                .delivery_type(orderDTO.getDelivery_type())
                .delivery_type_cost(orderDTO.getDelivery_type_cost())
                .promo_code(orderDTO.getPromo_code())
                .totalItemCount(orderDTO.getTotalItemCount())
                .user_id(orderDTO.getUser_id())
                .status(orderDTO.getStatus())
                .paymentMethod(orderDTO.getPaymentMethod())
                .build();

    }


    public Payload toDTO(Order order) {
        return Payload.builder()
                .id(order.getId())
                .items(order.getItems())
                .contact_number(order.getContact_number())
//                .cost_after_delivery_rate(order.getCost_after_delivery_rate())
//                .cost_before_delivery_rate(order.getCost_before_delivery_rate())
                .delivery_type(order.getDelivery_type())
                .delivery_type_cost(order.getDelivery_type_cost())
                .promo_code(order.getPromo_code())
                .totalItemCount(order.getTotalItemCount())
                .user_id(order.getUser_id())
                .status(order.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .build();

    }
}
