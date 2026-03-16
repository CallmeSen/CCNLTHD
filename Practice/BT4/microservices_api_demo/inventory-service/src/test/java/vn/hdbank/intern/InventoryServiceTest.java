package vn.hdbank.intern;


import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import vn.hdbank.intern.inventoryservice.dto.BaseResponse;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class InventoryServiceTest {


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
    void shouldCheckInventory() {
        var response = RestAssured.given()
                .when()
                .get("/v1/api/inventory?skuCode=iPhone_13")
                .then()
                .log().all()
                .statusCode(200)
                .extract().as(BaseResponse.class);

        assertNotNull(response);
        assertEquals("iPhone_13", response.getSkuCode());
        assertEquals(79, response.getQuantity());
        assertTrue(response.isInStock());



        var negativeResponse = RestAssured.given()
                .when()
                .get("/v1/api/inventory?skuCode=iPhone_18")
                .then()
                .log().all()
                .statusCode(200)
                .extract().as(BaseResponse.class);

        assertNotNull(response);
        assertEquals("iPhone_18", negativeResponse.getSkuCode());
        assertEquals(0, negativeResponse.getQuantity());
        assertFalse(negativeResponse.isInStock());
    }
}
