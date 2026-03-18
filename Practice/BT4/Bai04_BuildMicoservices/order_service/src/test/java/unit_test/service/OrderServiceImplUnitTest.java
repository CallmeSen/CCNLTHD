package unit_test.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nhom1.order_service.domain.Order;
import com.nhom1.order_service.domain.OrderLineItems;
import com.nhom1.order_service.dto.CreateOrderLineItemRequest;
import com.nhom1.order_service.dto.CreateOrderRequest;
import com.nhom1.order_service.dto.OrderResponse;
import com.nhom1.order_service.exception.InventoryServiceUnavailableException;
import com.nhom1.order_service.exception.OutOfStockException;
import com.nhom1.order_service.exception.ResourceNotFoundException;
import com.nhom1.order_service.integration.InventoryServiceClient;
import com.nhom1.order_service.listener.OrderEventProducer;
import com.nhom1.order_service.repository.OrderRepository;
import com.nhom1.order_service.service.impl.OrderServiceImpl;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@DisplayName("Unit Test - Service Layer - OrderServiceImpl")
@ExtendWith(MockitoExtension.class)
class OrderServiceImplUnitTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private InventoryServiceClient inventoryServiceClient;

    @Mock
    private OrderEventProducer orderEventProducer;

    @InjectMocks
    private OrderServiceImpl orderService;

    @Test
    @DisplayName("UT-SRV-01 should place order when all items are in stock")
    void should_place_order_when_all_items_are_in_stock() {
        CreateOrderRequest request = createOrderRequest(List.of(createLineItem("iphone_13", "1200", 1)));

        when(inventoryServiceClient.isInStock("iphone_13", 1)).thenReturn(CompletableFuture.completedFuture(true));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        orderService.placeOrder(request);

        verify(orderRepository, times(1)).save(any(Order.class));
        verify(orderEventProducer, times(1)).sendOrderPlacedEvent(any(String.class));
    }

    @Test
    @DisplayName("UT-SRV-02 should throw OutOfStockException when any item is out of stock")
    void should_throw_out_of_stock_when_any_item_is_out_of_stock() {
        CreateOrderRequest request = createOrderRequest(List.of(createLineItem("iphone_13_out", "1200", 1)));

        when(inventoryServiceClient.isInStock("iphone_13_out", 1)).thenReturn(CompletableFuture.completedFuture(false));

        assertThrows(OutOfStockException.class, () -> orderService.placeOrder(request));

        verify(orderRepository, never()).save(any(Order.class));
        verify(orderEventProducer, never()).sendOrderPlacedEvent(any(String.class));
    }

    @Test
    @DisplayName("UT-SRV-03 should propagate inventory unavailable exception")
    void should_propagate_inventory_unavailable_exception() {
        CreateOrderRequest request = createOrderRequest(List.of(createLineItem("iphone_13", "1200", 1)));
        CompletableFuture<Boolean> failedFuture = new CompletableFuture<>();
        failedFuture.completeExceptionally(
                new InventoryServiceUnavailableException("Inventory service is unavailable", new RuntimeException("down")));

        when(inventoryServiceClient.isInStock("iphone_13", 1)).thenReturn(failedFuture);

        assertThrows(InventoryServiceUnavailableException.class, () -> orderService.placeOrder(request));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("UT-SRV-04 should map request line item into order line item entity")
    void should_map_request_line_item_to_entity() {
        CreateOrderRequest request = createOrderRequest(List.of(createLineItem("iphone_13", "1200.50", 2)));

        when(inventoryServiceClient.isInStock("iphone_13", 2)).thenReturn(CompletableFuture.completedFuture(true));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        orderService.placeOrder(request);

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(orderCaptor.capture());

        Order savedOrder = orderCaptor.getValue();
        assertEquals(1, savedOrder.getOrderLineItemsList().size());
        assertEquals("iphone_13", savedOrder.getOrderLineItemsList().get(0).getSkuCode());
        assertEquals(new BigDecimal("1200.50"), savedOrder.getOrderLineItemsList().get(0).getPrice());
        assertEquals(2, savedOrder.getOrderLineItemsList().get(0).getQuantity());
    }

    @Test
    @DisplayName("UT-SRV-05 should generate non-empty order number")
    void should_generate_non_empty_order_number() {
        CreateOrderRequest request = createOrderRequest(List.of(createLineItem("iphone_13", "100", 1)));

        when(inventoryServiceClient.isInStock("iphone_13", 1)).thenReturn(CompletableFuture.completedFuture(true));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        orderService.placeOrder(request);

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(orderCaptor.capture());

        assertNotNull(orderCaptor.getValue().getOrderNumber());
        assertTrue(!orderCaptor.getValue().getOrderNumber().isBlank());
    }

    @Test
    @DisplayName("UT-SRV-06 should return order response when id exists")
    void should_return_order_response_when_id_exists() {
        Order order = new Order();
        order.setOrderNumber("ORD-001");

        OrderLineItems lineItem = new OrderLineItems();
        lineItem.setSkuCode("iphone_13");
        lineItem.setPrice(new BigDecimal("1200"));
        lineItem.setQuantity(1);
        order.addLineItem(lineItem);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.getOrderById(1L);

        assertEquals("ORD-001", response.getOrderNumber());
        assertEquals(1, response.getOrderLineItemsList().size());
        assertEquals("iphone_13", response.getOrderLineItemsList().get(0).getSkuCode());
    }

    @Test
    @DisplayName("UT-SRV-07 should throw not found when id does not exist")
    void should_throw_not_found_when_id_does_not_exist() {
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> orderService.getOrderById(999L));
    }

    @Test
    @DisplayName("UT-SRV-08 should verify all line items against inventory")
    void should_verify_all_line_items_against_inventory() {
        CreateOrderRequest request = createOrderRequest(List.of(
                createLineItem("iphone_13", "1200", 1),
                createLineItem("airpods_3", "200", 2)));

        when(inventoryServiceClient.isInStock("iphone_13", 1)).thenReturn(CompletableFuture.completedFuture(true));
        when(inventoryServiceClient.isInStock("airpods_3", 2)).thenReturn(CompletableFuture.completedFuture(true));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        orderService.placeOrder(request);

        verify(inventoryServiceClient, times(1)).isInStock(eq("iphone_13"), eq(1));
        verify(inventoryServiceClient, times(1)).isInStock(eq("airpods_3"), eq(2));
        verify(orderRepository, times(1)).save(any(Order.class));
    }

    private static CreateOrderLineItemRequest createLineItem(String skuCode, String price, int quantity) {
        CreateOrderLineItemRequest lineItem = new CreateOrderLineItemRequest();
        lineItem.setSkuCode(skuCode);
        lineItem.setPrice(new BigDecimal(price));
        lineItem.setQuantity(quantity);
        return lineItem;
    }

    private static CreateOrderRequest createOrderRequest(List<CreateOrderLineItemRequest> items) {
        CreateOrderRequest request = new CreateOrderRequest();
        request.setOrderLineItemsDtoList(items);
        return request;
    }
}
