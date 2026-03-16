package vn.hdbank.intern.orderservice.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import vn.hdbank.intern.orderservice.dto.BaseResponse;
import vn.hdbank.intern.orderservice.dto.OrderLineItemsDTO;
import vn.hdbank.intern.orderservice.listener.OrderEventProducer;
import vn.hdbank.intern.orderservice.model.Order;
import vn.hdbank.intern.orderservice.model.OrderLineItems;
import vn.hdbank.intern.orderservice.repository.OrderRepo;

import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@AllArgsConstructor
public class OrderService {

    private final OrderRepo orderRepo;
    private final RestTemplate restTemplate;
    private final OrderEventProducer orderEventProducer;



//    public Order placeOrder(OrderDTO orderDTO) {
//
//        List<String> skuCodes = orderDTO.getOrderLineItemsDtoList()
//                .stream()
//                .map(OrderLineItemsDTO::getSkuCode)
//                .collect(Collectors.toList());
//
//        ResponseEntity<BaseResponse[]> responseEntity = restTemplate.getForEntity(
//                "http://localhost:8081/v1/api/inventory?skucode={skuCodes}",
//                BaseResponse[].class,
//                Map.of("skuCodes", String.join(",", skuCodes))
//        );
//
//        BaseResponse[] baseResponses = responseEntity.getBody();
//
//        boolean allInStock = Arrays.stream(baseResponses)
//                .allMatch(BaseResponse::isInStock);
//
//        if (!allInStock) {
//            throw new IllegalArgumentException("Out of stock !!!");
//        }
//
//        Order order = new Order();
//        order.setOrderNumber(UUID.randomUUID().toString());
//        order.setOrderLineItems(orderDTO.getOrderLineItemsDtoList()
//                .stream()
//                .map(orderLineItemsMapper::toEntity)
//                .collect(Collectors.toList()));
//
//        Order savedOrder = orderRepo.save(order);
//
//        orderEventProducer.sendOrderEvent("Order " + savedOrder.getOrderNumber() + " has been placed successfully.");
//
//        return savedOrder;
//    }

    @CircuitBreaker(name = "inventory-service", fallbackMethod = "fallbackPlaceOrder")
    @Retry(name = "inventory-service")
    @TimeLimiter(name = "inventory-service")
    @CacheEvict(value = "orders", key = "#order.orderNumber")
    public CompletableFuture<Boolean> placeOrder(OrderLineItemsDTO orderLineItemsDTO) {
        return CompletableFuture.supplyAsync(() -> {
            String skuCode = orderLineItemsDTO.getSkuCode();
            int requestQuantity = orderLineItemsDTO.getQuantity();
            String url = "http://INVENTORY-SERVICE/v1/api/inventory?skuCode=" + skuCode;

//            boolean check = restTemplate.getForObject(url, Boolean.class);

            BaseResponse response = restTemplate.getForObject(url, BaseResponse.class);
            if (response != null && response.isInStock() && response.getQuantity() >= requestQuantity) {
                Order order = Order.builder()
                        .orderNumber(UUID.randomUUID().toString())
                        .build();

                OrderLineItems orderLineItems = OrderLineItems.builder()
                        .skuCode(skuCode)
                        .price(orderLineItemsDTO.getPrice())
                        .quantity(orderLineItemsDTO.getQuantity())
                        .order(order)
                        .build();
                order.setOrderLineItems(Collections.singletonList(orderLineItems));

                updateInventoryStock(skuCode, requestQuantity);
                orderRepo.save(order);
                orderEventProducer.sendOrderEvent("Order has been placed successfully");
                return true;

            } else {
                log.warn("Product not found");
                orderEventProducer.sendOrderEvent("Order Fail");
                return false;
            }
        });
    }


    // Fallback nếu Inventory Service không phản hồi
    private CompletableFuture<Boolean> fallbackPlaceOrder(OrderLineItemsDTO orderLineItemsDTO, Throwable t) {
        log.error("Inventory Service is down: {}", t.getMessage());
        orderEventProducer.sendOrderEvent("Order failed due to inventory service issue");
        return CompletableFuture.completedFuture(false);
    }

    private void updateInventoryStock(String skuCode, int quantity) {
        String url = "http://INVENTORY-SERVICE/v1/api/inventory/updateStock?skuCode=" + skuCode + "&quantity=" + quantity;
        restTemplate.put(url, null);
    }






}
