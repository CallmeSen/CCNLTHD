package vn.tt.practice.orderservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.tt.practice.orderservice.config.ProductClient;
import vn.tt.practice.orderservice.dto.Payload;
import vn.tt.practice.orderservice.mapper.OrderMapper;
import vn.tt.practice.orderservice.model.Order;
import vn.tt.practice.orderservice.producer.OrderEventProducer;
import vn.tt.practice.orderservice.repository.OrderRepo;
import vn.tt.practice.productservice.dto.ProductDTO;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepo orderRepo;
    private final OrderMapper orderMapper;
    private final ProductClient productClient;
    private final OrderEventProducer orderEventProducer;
    private final MongoTemplate mongoTemplate;

    public Payload placeOrder(Payload payload) {
        payload.setStatus("PENDING");

        for (ProductDTO product : payload.getItems()) {
            try {
                productClient.decreaseQuantity(product.getId(), product.getQuantity());
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Failed to update product quantity for product ID: " + product.getId(), e);
            }
        }

//        PaymentMethod paymentMethod = PaymentMethod.fromCode(payload.getPaymentMethod());

        // Save order
        Order orderEntity = orderMapper.toEntity(payload);
        Order savedOrder = orderRepo.save(orderEntity);

        // Sau khi save thì ID đã được MongoDB sinh ra
        Payload savedPayload = orderMapper.toDTO(savedOrder);

        // Send event (nếu cần)
        String message = "Order placed successfully with id: " + savedPayload.getId();
        orderEventProducer.sendOrderEvent(message, savedPayload.getUser_id());

        return savedPayload;
    }

    public List<Payload> findByUserId(String user_id) {
        Query query = new Query();
        query.addCriteria(Criteria.where("user_id").is(user_id));

        List<Order> orders = mongoTemplate.find(query, Order.class);

        if (orders == null || orders.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No orders found for user: " + user_id);
        }

        return orders.stream()
                .map(orderMapper::toDTO)
                .collect(Collectors.toList());
    }

    public Payload cancelOrder(String id) {
        Order order = orderRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + id));

        order.setStatus("CANCELED");

        Order updatedOrder = orderRepo.save(order);

        return orderMapper.toDTO(updatedOrder);
    }
}

