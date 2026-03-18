package integration_test.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nhom1.order_service.OrderServiceApplication;
import com.nhom1.order_service.domain.Order;
import com.nhom1.order_service.domain.OrderLineItems;
import com.nhom1.order_service.integration.InventoryServiceClient;
import com.nhom1.order_service.listener.OrderEventProducer;
import com.nhom1.order_service.repository.OrderRepository;
import java.math.BigDecimal;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@DisplayName("Integration Test - API Validation and Exception Mapping")
@SpringBootTest(classes = OrderServiceApplication.class)
@AutoConfigureMockMvc
class OrderApiIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private OrderRepository orderRepository;

        @MockBean
        private InventoryServiceClient inventoryServiceClient;

        @MockBean
        private OrderEventProducer orderEventProducer;

    @Test
    @DisplayName("IT-API-01 should return 400 when orderLineItemsDtoList is missing")
        void should_return_400_when_order_line_items_list_is_missing() throws Exception {
                String requestBody = "{}";

                mockMvc.perform(post("/api/order")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(requestBody))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("IT-API-02 should return 400 when skuCode is blank")
        void should_return_400_when_sku_code_is_blank() throws Exception {
                String requestBody = """
                                {
                                    "orderLineItemsDtoList": [
                                        {
                                            "skuCode": "",
                                            "price": 1200,
                                            "quantity": 1
                                        }
                                    ]
                                }
                                """;

                mockMvc.perform(post("/api/order")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(requestBody))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.details['orderLineItemsDtoList[0].skuCode']").value("skuCode is required"));
    }

    @Test
    @DisplayName("IT-API-03 should return 400 when price is negative")
        void should_return_400_when_price_is_negative() throws Exception {
                String requestBody = """
                                {
                                    "orderLineItemsDtoList": [
                                        {
                                            "skuCode": "iphone_13",
                                            "price": -1,
                                            "quantity": 1
                                        }
                                    ]
                                }
                                """;

                mockMvc.perform(post("/api/order")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(requestBody))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.details['orderLineItemsDtoList[0].price']").value("price must be greater than 0"));
    }

    @Test
    @DisplayName("IT-API-04 should return 400 when quantity is zero or negative")
        void should_return_400_when_quantity_is_zero_or_negative() throws Exception {
                String requestBody = """
                                {
                                    "orderLineItemsDtoList": [
                                        {
                                            "skuCode": "iphone_13",
                                            "price": 1200,
                                            "quantity": 0
                                        }
                                    ]
                                }
                                """;

                mockMvc.perform(post("/api/order")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(requestBody))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.details['orderLineItemsDtoList[0].quantity']").value("quantity must be greater than 0"));
    }

    @Test
    @DisplayName("IT-API-05 should return 200 when get order by id exists")
        void should_return_200_when_get_order_by_id_exists() throws Exception {
                orderRepository.deleteAll();

                Order order = new Order();
                order.setOrderNumber("ORD-INT-001");

                OrderLineItems lineItem = new OrderLineItems();
                lineItem.setSkuCode("iphone_13");
                lineItem.setPrice(new BigDecimal("1200"));
                lineItem.setQuantity(1);
                order.addLineItem(lineItem);

                Order savedOrder = orderRepository.save(order);

                mockMvc.perform(get("/api/order/{id}", savedOrder.getId()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(savedOrder.getId()))
                                .andExpect(jsonPath("$.orderNumber").value("ORD-INT-001"))
                                .andExpect(jsonPath("$.orderLineItemsList[0].skuCode").value("iphone_13"));
    }

    @Test
    @DisplayName("IT-API-06 should return 404 when get order by id does not exist")
        void should_return_404_when_get_order_by_id_does_not_exist() throws Exception {
                orderRepository.deleteAll();
                when(inventoryServiceClient.isInStock(any(), eq(1))).thenReturn(CompletableFuture.completedFuture(true));

                mockMvc.perform(get("/api/order/999999"))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }
}
