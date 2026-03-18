package com.nhom1.order_service.controller;

import com.nhom1.order_service.dto.ApiMessageResponse;
import com.nhom1.order_service.dto.CreateOrderRequest;
import com.nhom1.order_service.dto.OrderResponse;
import com.nhom1.order_service.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/order")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<ApiMessageResponse> placeOrder(@Valid @RequestBody CreateOrderRequest request) {
        orderService.placeOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiMessageResponse("Order Placed"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }
}
