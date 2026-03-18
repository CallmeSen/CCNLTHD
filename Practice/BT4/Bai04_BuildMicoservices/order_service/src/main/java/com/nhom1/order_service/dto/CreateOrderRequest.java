package com.nhom1.order_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class CreateOrderRequest {

    @NotEmpty(message = "orderLineItemsDtoList must not be empty")
    @Valid
    private List<CreateOrderLineItemRequest> orderLineItemsDtoList;

    public List<CreateOrderLineItemRequest> getOrderLineItemsDtoList() {
        return orderLineItemsDtoList;
    }

    public void setOrderLineItemsDtoList(List<CreateOrderLineItemRequest> orderLineItemsDtoList) {
        this.orderLineItemsDtoList = orderLineItemsDtoList;
    }
}
