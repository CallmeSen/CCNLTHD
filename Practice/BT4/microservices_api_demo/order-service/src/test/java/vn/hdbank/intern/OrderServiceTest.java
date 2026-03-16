package vn.hdbank.intern;

import io.restassured.RestAssured;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import vn.hdbank.intern.orderservice.OrderServiceApplication;

import static org.hamcrest.MatcherAssert.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        classes = OrderServiceApplication.class // Load đúng context của Order Service
)
class OrderServiceTest {

    @ServiceConnection
    private static PostgreSQLContainer postgreSQLContainer = new PostgreSQLContainer("postgres");

    @LocalServerPort
    private int port;

    @BeforeEach
    public void setUp() {
        RestAssured.baseURI = "http://localhost";
        RestAssured.port = port;
    }

    static {
        postgreSQLContainer.start();
    }

    @Test
    void isSubmitOrder() {
        String submitOrderJson = """
                {
                  "skuCode": "iPhone_13",
                  "price": 1200,
                  "quantity": 1
                }
                """;
        var responseBodyString = RestAssured.given()
                .contentType("application/json")
                .body(submitOrderJson)
                .when()
                .post("/v1/api/order")
                .then()
                .log().all()
                .statusCode(201)
                .extract()
                .body().asString();
        assertThat(responseBodyString, Matchers.is("Order Placed"));
    }

    @Test
    void isNotSubmitOrder() {
        String submitOrderJson = """
                {
                  "skuCode": "iPhone_17",
                  "price": 1200,
                  "quantity": 1
                }
                """;
        var responseBodyString = RestAssured.given()
                .contentType("application/json")
                .body(submitOrderJson)
                .when()
                .post("/v1/api/order")
                .then()
                .log().all()
                .statusCode(400)
                .extract()
                .body().asString();
        assertThat(responseBodyString, Matchers.is("Failed to Place Order"));
    }

}
