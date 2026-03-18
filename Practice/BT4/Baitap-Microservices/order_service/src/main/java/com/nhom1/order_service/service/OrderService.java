package com.nhom1.order_service.service;

import com.nhom1.order_service.dto.CreateOrderRequest;
import com.nhom1.order_service.dto.OrderResponse;

public interface OrderService {

    void placeOrder(CreateOrderRequest request);

    OrderResponse getOrderById(Long id);
}
