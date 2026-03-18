package vn.hdbank.intern.orderservice.controller;

import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import vn.hdbank.intern.orderservice.dto.OrderLineItemsDTO;
import vn.hdbank.intern.orderservice.service.OrderService;

import java.util.concurrent.CompletableFuture;

@Slf4j
@RestController
@RequestMapping("/v1/api/order")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;

    @PostMapping("")
    @ResponseStatus(HttpStatus.CREATED)
    public CompletableFuture<ResponseEntity<String>> getPlaceOrder(@RequestBody OrderLineItemsDTO orderLineItemsDTO) {

        return orderService.placeOrder(orderLineItemsDTO)
                .thenApply(response -> {
                    if (response) {
                        log.info("Order Placed");
                        return ResponseEntity.status(HttpStatus.CREATED).body("Order Placed");
                    } else {
                        log.info("Order Not Placed");
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed to Place Order");
                    }
                });
    }

    @GetMapping("")
    public ResponseEntity<String> getPlaceOrders() {
        return ResponseEntity.status(HttpStatus.OK).body("Order Placed");
    }

//    public String placeOrder(@RequestBody OrderDTO orderDTO) {
//        Order order = orderService.placeOrder(orderDTO);
//        return "Order placed successfully";
//    }





}
