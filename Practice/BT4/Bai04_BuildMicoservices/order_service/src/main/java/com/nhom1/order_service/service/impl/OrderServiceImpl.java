package com.nhom1.order_service.service.impl;

import com.nhom1.order_service.domain.Order;
import com.nhom1.order_service.domain.OrderLineItems;
import com.nhom1.order_service.dto.CreateOrderLineItemRequest;
import com.nhom1.order_service.dto.CreateOrderRequest;
import com.nhom1.order_service.dto.OrderLineItemResponse;
import com.nhom1.order_service.dto.OrderResponse;
import com.nhom1.order_service.exception.ResourceNotFoundException;
import com.nhom1.order_service.repository.OrderRepository;
import com.nhom1.order_service.service.OrderService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;

    public OrderServiceImpl(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    @Transactional
    public void placeOrder(CreateOrderRequest request) {
        Order order = new Order();
        order.setOrderNumber(UUID.randomUUID().toString());

        List<OrderLineItems> lineItems = request.getOrderLineItemsDtoList()
                .stream()
                .map(this::toOrderLineItem)
                .toList();

        order.setOrderLineItemsList(lineItems);
        orderRepository.save(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id " + id));

        return toOrderResponse(order);
    }

    private OrderLineItems toOrderLineItem(CreateOrderLineItemRequest request) {
        OrderLineItems lineItem = new OrderLineItems();
        lineItem.setSkuCode(request.getSkuCode());
        lineItem.setPrice(request.getPrice());
        lineItem.setQuantity(request.getQuantity());
        return lineItem;
    }

    private OrderResponse toOrderResponse(Order order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setOrderNumber(order.getOrderNumber());

        List<OrderLineItemResponse> lineItemResponses = order.getOrderLineItemsList()
                .stream()
                .map(this::toOrderLineItemResponse)
                .toList();
        response.setOrderLineItemsList(lineItemResponses);

        return response;
    }

    private OrderLineItemResponse toOrderLineItemResponse(OrderLineItems lineItem) {
        OrderLineItemResponse response = new OrderLineItemResponse();
        response.setId(lineItem.getId());
        response.setSkuCode(lineItem.getSkuCode());
        response.setPrice(lineItem.getPrice());
        response.setQuantity(lineItem.getQuantity());
        return response;
    }
}
