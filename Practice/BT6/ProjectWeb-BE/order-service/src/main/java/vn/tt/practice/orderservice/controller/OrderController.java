package vn.tt.practice.orderservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.tt.practice.orderservice.dto.Payload;
import vn.tt.practice.orderservice.mapper.OrderMapper;
import vn.tt.practice.orderservice.model.PaymentMethod;
import vn.tt.practice.orderservice.repository.OrderRepo;
import vn.tt.practice.orderservice.service.OrderService;

import java.util.List;

@RestController
@RequestMapping("/v1/api/order")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/place-order")
    public ResponseEntity<Payload> placeOrder(@RequestBody Payload request) {
        System.out.println("Payment method received: " + request.getPaymentMethod());
        PaymentMethod method = PaymentMethod.fromCode(request.getPaymentMethod());
        if (request.getUser_id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please login first");
        }
        

        Payload createdOrder = orderService.placeOrder(request);
        return ResponseEntity.ok(createdOrder);
    }

    @GetMapping("/{user_id}/get-orders")
    public ResponseEntity<List<Payload>> getOrderByUserId(@PathVariable String user_id) {
        List<Payload> orders = orderService.findByUserId(user_id);
        return ResponseEntity.ok(orders);
    }

    @PostMapping("/cancel-order")
    public ResponseEntity<Payload> cancelOrder(@RequestBody Payload request) {
        Payload cancelledOrder = orderService.cancelOrder(request.getId());
        return ResponseEntity.ok(cancelledOrder);
    }
}

