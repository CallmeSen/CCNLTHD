package integration_test.e2e;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nhom1.order_service.OrderServiceApplication;
import com.nhom1.order_service.exception.InventoryServiceUnavailableException;
import com.nhom1.order_service.integration.InventoryServiceClient;
import com.nhom1.order_service.listener.OrderEventProducer;
import com.nhom1.order_service.repository.OrderRepository;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@DisplayName("Integration Test - End To End Order Flow")
@SpringBootTest(classes = OrderServiceApplication.class)
@AutoConfigureMockMvc
class OrderFlowIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private OrderRepository orderRepository;

        @MockBean
        private InventoryServiceClient inventoryServiceClient;

        @MockBean
        private OrderEventProducer orderEventProducer;

    @Test
    @DisplayName("IT-E2E-01 should place order successfully and publish kafka event")
        void should_place_order_successfully_and_publish_kafka_event() throws Exception {
                orderRepository.deleteAll();
                when(inventoryServiceClient.isInStock("iphone_13", 1)).thenReturn(CompletableFuture.completedFuture(true));

                String requestBody = """
                                {
                                    "orderLineItemsDtoList": [
                                        {
                                            "skuCode": "iphone_13",
                                            "price": 1200,
                                            "quantity": 1
                                        }
                                    ]
                                }
                                """;

                mockMvc.perform(post("/api/order")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(requestBody))
                                .andExpect(status().isCreated())
                                .andExpect(jsonPath("$.message").value("Order Placed"));

                verify(orderEventProducer, times(1)).sendOrderPlacedEvent(any(String.class));
                org.junit.jupiter.api.Assertions.assertEquals(1L, orderRepository.count());
    }

    @Test
    @DisplayName("IT-E2E-02 should reject order when item is out of stock")
        void should_reject_order_when_item_is_out_of_stock() throws Exception {
                orderRepository.deleteAll();
                when(inventoryServiceClient.isInStock("iphone_13", 1)).thenReturn(CompletableFuture.completedFuture(false));

                String requestBody = """
                                {
                                    "orderLineItemsDtoList": [
                                        {
                                            "skuCode": "iphone_13",
                                            "price": 1200,
                                            "quantity": 1
                                        }
                                    ]
                                }
                                """;

                mockMvc.perform(post("/api/order")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(requestBody))
                                .andExpect(status().isConflict())
                                .andExpect(jsonPath("$.code").value("OUT_OF_STOCK"));

                verify(orderEventProducer, never()).sendOrderPlacedEvent(any(String.class));
                org.junit.jupiter.api.Assertions.assertEquals(0L, orderRepository.count());
    }

    @Test
    @DisplayName("IT-E2E-03 should return 503 when inventory timeout occurs")
        void should_return_503_when_inventory_timeout_occurs() throws Exception {
                orderRepository.deleteAll();
                CompletableFuture<Boolean> failedFuture = new CompletableFuture<>();
                failedFuture.completeExceptionally(
                                new InventoryServiceUnavailableException("timeout", new RuntimeException("timeout")));
                when(inventoryServiceClient.isInStock("iphone_13", 1)).thenReturn(failedFuture);

                String requestBody = """
                                {
                                    "orderLineItemsDtoList": [
                                        {
                                            "skuCode": "iphone_13",
                                            "price": 1200,
                                            "quantity": 1
                                        }
                                    ]
                                }
                                """;

                mockMvc.perform(post("/api/order")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(requestBody))
                                .andExpect(status().isServiceUnavailable())
                                .andExpect(jsonPath("$.code").value("INVENTORY_UNAVAILABLE"));

                org.junit.jupiter.api.Assertions.assertEquals(0L, orderRepository.count());
    }

    @Test
    @Disabled("Enable when retry/fallback flow handles transient RuntimeException without bubbling ServletException")
    @DisplayName("IT-E2E-04 should recover with retry when inventory transient failure occurs")
        void should_recover_with_retry_when_inventory_transient_failure_occurs() throws Exception {
                // TODO(enable): remove @Disabled after retry policy is wired so transient inventory errors recover to 201.
                orderRepository.deleteAll();

                CompletableFuture<Boolean> failedFuture = new CompletableFuture<>();
                failedFuture.completeExceptionally(new RuntimeException("transient"));
                when(inventoryServiceClient.isInStock("iphone_13", 1))
                                .thenReturn(failedFuture)
                                .thenReturn(CompletableFuture.completedFuture(true));

                String requestBody = """
                                {
                                    "orderLineItemsDtoList": [
                                        {
                                            "skuCode": "iphone_13",
                                            "price": 1200,
                                            "quantity": 1
                                        }
                                    ]
                                }
                                """;

                mockMvc.perform(post("/api/order")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(requestBody))
                                .andExpect(status().isCreated());

                verify(inventoryServiceClient, times(2)).isInStock(eq("iphone_13"), eq(1));
    }

    @Test
    @DisplayName("IT-E2E-05 should return 503 when inventory service is down")
        void should_return_503_when_inventory_service_is_down() throws Exception {
                orderRepository.deleteAll();
                CompletableFuture<Boolean> failedFuture = new CompletableFuture<>();
                failedFuture.completeExceptionally(
                                new InventoryServiceUnavailableException("down", new RuntimeException("connection refused")));
                when(inventoryServiceClient.isInStock("iphone_13", 1)).thenReturn(failedFuture);

                String requestBody = """
                                {
                                    "orderLineItemsDtoList": [
                                        {
                                            "skuCode": "iphone_13",
                                            "price": 1200,
                                            "quantity": 1
                                        }
                                    ]
                                }
                                """;

                mockMvc.perform(post("/api/order")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(requestBody))
                                .andExpect(status().isServiceUnavailable())
                                .andExpect(jsonPath("$.code").value("INVENTORY_UNAVAILABLE"));

                verify(orderEventProducer, never()).sendOrderPlacedEvent(any(String.class));
                org.junit.jupiter.api.Assertions.assertEquals(0L, orderRepository.count());
    }
}
