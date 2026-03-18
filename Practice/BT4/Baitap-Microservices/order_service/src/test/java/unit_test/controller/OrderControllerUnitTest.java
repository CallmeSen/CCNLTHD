package unit_test.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nhom1.order_service.controller.OrderController;
import com.nhom1.order_service.dto.OrderLineItemResponse;
import com.nhom1.order_service.dto.OrderResponse;
import com.nhom1.order_service.exception.GlobalExceptionHandler;
import com.nhom1.order_service.service.OrderService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@DisplayName("Unit Test - Controller Layer - OrderController")
@ExtendWith(MockitoExtension.class)
class OrderControllerUnitTest {

        @Mock
        private OrderService orderService;

        @InjectMocks
        private OrderController orderController;

        private MockMvc mockMvc;

        @BeforeEach
        void setUp() {
                mockMvc = MockMvcBuilders
                                .standaloneSetup(orderController)
                                .setControllerAdvice(new GlobalExceptionHandler())
                                .build();
        }

        @Test
        @DisplayName("UT-CTL-01 should return 201 when place order payload is valid")
        void should_return_201_when_place_order_payload_is_valid() throws Exception {
                doNothing().when(orderService).placeOrder(any());

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
        }

        @Test
        @DisplayName("UT-CTL-02 should return 200 when get order by id is valid")
        void should_return_200_when_get_order_by_id_is_valid() throws Exception {
                OrderLineItemResponse item = new OrderLineItemResponse();
                item.setId(1L);
                item.setSkuCode("iphone_13");
                item.setPrice(new BigDecimal("1200"));
                item.setQuantity(1);

                OrderResponse response = new OrderResponse();
                response.setId(10L);
                response.setOrderNumber("ORD-UNIT-001");
                response.setOrderLineItemsList(List.of(item));

                when(orderService.getOrderById(eq(10L))).thenReturn(response);

                mockMvc.perform(get("/api/order/10"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(10))
                                .andExpect(jsonPath("$.orderNumber").value("ORD-UNIT-001"))
                                .andExpect(jsonPath("$.orderLineItemsList[0].skuCode").value("iphone_13"));
        }

        @Test
        @DisplayName("UT-CTL-03 should return 400 when order line item list is empty")
        void should_return_400_when_order_line_items_list_is_empty() throws Exception {
                String requestBody = """
                                {
                                    "orderLineItemsDtoList": []
                                }
                                """;

                mockMvc.perform(post("/api/order")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(requestBody))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                                .andExpect(jsonPath("$.details.orderLineItemsDtoList").exists());
        }

        @Test
        @DisplayName("UT-CTL-04 should return 400 when skuCode is blank")
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
        @DisplayName("UT-CTL-05 should return 400 when price is not positive")
        void should_return_400_when_price_is_not_positive() throws Exception {
                String requestBody = """
                                {
                                    "orderLineItemsDtoList": [
                                        {
                                            "skuCode": "iphone_13",
                                            "price": 0,
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
        @DisplayName("UT-CTL-06 should return 400 when quantity is not positive")
        void should_return_400_when_quantity_is_not_positive() throws Exception {
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
}
