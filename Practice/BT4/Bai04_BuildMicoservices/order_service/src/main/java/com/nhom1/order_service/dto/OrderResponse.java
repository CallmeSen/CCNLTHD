package com.nhom1.order_service.dto;

import java.util.List;

public class OrderResponse {

    private Long id;
    private String orderNumber;
    private List<OrderLineItemResponse> orderLineItemsList;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public List<OrderLineItemResponse> getOrderLineItemsList() {
        return orderLineItemsList;
    }

    public void setOrderLineItemsList(List<OrderLineItemResponse> orderLineItemsList) {
        this.orderLineItemsList = orderLineItemsList;
    }
}
