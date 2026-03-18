package unit_test.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nhom1.order_service.exception.GlobalExceptionHandler;
import com.nhom1.order_service.exception.InventoryServiceUnavailableException;
import com.nhom1.order_service.exception.OutOfStockException;
import com.nhom1.order_service.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@DisplayName("Unit Test - Exception Layer - GlobalExceptionHandler")
class GlobalExceptionHandlerUnitTest {

    private final MockMvc mockMvc = MockMvcBuilders
            .standaloneSetup(new ThrowingController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    @DisplayName("UT-EX-01 should map ResourceNotFoundException to 404")
    void should_map_resource_not_found_to_404() throws Exception {
        mockMvc.perform(get("/test-exception/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("UT-EX-02 should map OutOfStockException to 409")
    void should_map_out_of_stock_to_409() throws Exception {
        mockMvc.perform(get("/test-exception/out-of-stock"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OUT_OF_STOCK"));
    }

    @Test
    @DisplayName("UT-EX-03 should map InventoryServiceUnavailableException to 503")
    void should_map_inventory_unavailable_to_503() throws Exception {
        mockMvc.perform(get("/test-exception/inventory-unavailable"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("INVENTORY_UNAVAILABLE"));
    }

    @Test
    @DisplayName("UT-EX-04 should map validation errors to 400 with details")
    void should_map_validation_errors_to_400_with_details() throws Exception {
        mockMvc.perform(post("/test-exception/validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.name").value("name is required"));
    }

    @RestController
    static class ThrowingController {

        @GetMapping("/test-exception/not-found")
        String notFound() {
            throw new ResourceNotFoundException("Order not found");
        }

        @GetMapping("/test-exception/out-of-stock")
        String outOfStock() {
            throw new OutOfStockException("Out of stock");
        }

        @GetMapping("/test-exception/inventory-unavailable")
        String inventoryUnavailable() {
            throw new InventoryServiceUnavailableException("Inventory down", new RuntimeException("down"));
        }

        @PostMapping("/test-exception/validation")
        String validation(@Valid @RequestBody ValidationRequest request) {
            return request.getName();
        }
    }

    static class ValidationRequest {

        @NotBlank(message = "name is required")
        private String name;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }
}
