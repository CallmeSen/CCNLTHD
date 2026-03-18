package unit_test.integration;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.nhom1.order_service.exception.InventoryServiceUnavailableException;
import com.nhom1.order_service.integration.InventoryServiceClient;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

@DisplayName("Unit Test - Integration Client Layer - InventoryServiceClient")
class InventoryServiceClientUnitTest {

    private static final String BASE_URL = "http://localhost:18081";

    @Test
    @DisplayName("UT-INV-01 should parse boolean true response")
    void should_parse_boolean_true_response() {
    RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    InventoryServiceClient client = new InventoryServiceClient(builder.build(), "/api/inventory");

    server.expect(requestTo(BASE_URL + "/api/inventory?skuCode=iphone_13"))
        .andRespond(withSuccess("true", MediaType.APPLICATION_JSON));

    boolean inStock = client.isInStock("iphone_13", 1).join();

    assertTrue(inStock);
    server.verify();
    }

    @Test
    @DisplayName("UT-INV-02 should parse map quantity response")
    void should_parse_map_quantity_response() {
    RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    InventoryServiceClient client = new InventoryServiceClient(builder.build(), "/api/inventory");

    server.expect(requestTo(BASE_URL + "/api/inventory?skuCode=iphone_13"))
        .andRespond(withSuccess("{\"quantity\": 3}", MediaType.APPLICATION_JSON));

    boolean inStock = client.isInStock("iphone_13", 2).join();

    assertTrue(inStock);
    server.verify();
    }

    @Test
    @DisplayName("UT-INV-03 should return false when map indicates out of stock")
    void should_return_false_when_map_indicates_out_of_stock() {
    RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    InventoryServiceClient client = new InventoryServiceClient(builder.build(), "/api/inventory");

    server.expect(requestTo(BASE_URL + "/api/inventory?skuCode=iphone_13"))
        .andRespond(withSuccess("{\"inStock\": false, \"quantity\": 100}", MediaType.APPLICATION_JSON));

    boolean inStock = client.isInStock("iphone_13", 1).join();

    assertFalse(inStock);
    server.verify();
    }

    @Test
    @DisplayName("UT-INV-04 should return false on null body")
    void should_return_false_on_null_body() {
    RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    InventoryServiceClient client = new InventoryServiceClient(builder.build(), "/api/inventory");

    server.expect(requestTo(BASE_URL + "/api/inventory?skuCode=iphone_13"))
        .andRespond(withStatus(HttpStatus.NO_CONTENT));

    boolean inStock = client.isInStock("iphone_13", 1).join();

    assertFalse(inStock);
    server.verify();
    }

    @Test
    @DisplayName("UT-INV-05 should use fallback when inventory call fails")
    void should_use_fallback_when_inventory_call_fails() {
    InventoryServiceClient client = new InventoryServiceClient(RestClient.builder().baseUrl(BASE_URL).build(), "/api/inventory");

    CompletableFuture<Boolean> fallbackFuture = ReflectionTestUtils.invokeMethod(
        client,
        "inventoryFallback",
        "iphone_13",
        1,
        new RuntimeException("Connection refused"));

    assertNotNull(fallbackFuture);
    CompletionException completionException = assertThrows(CompletionException.class, fallbackFuture::join);
    assertTrue(completionException.getCause() instanceof InventoryServiceUnavailableException);
    }
}
