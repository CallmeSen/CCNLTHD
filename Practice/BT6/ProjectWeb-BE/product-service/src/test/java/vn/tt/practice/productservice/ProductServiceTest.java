package vn.tt.practice.productservice;


import io.restassured.RestAssured;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.MongoDBContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProductServiceTest  {

    @ServiceConnection
    static MongoDBContainer mongoDBContainer = new MongoDBContainer("mongo");
    @LocalServerPort
    int port;

    @BeforeEach
    void setUp() {
        RestAssured.baseURI = "http://localhost";
        RestAssured.port = port;
    }

    static {
        mongoDBContainer.start();
    }

    @Test
    void isCreateProduct() {
        String requestBody = """
                
                {
                  "name": "PC Gaming",
                  "price": 1000,
                  "description": "test",
                  "image": "abc.xyz.com",
                  "checkToCart": true,
                  "quantity": 100,
                  "productCode": "PC01"
                }
                """;
        RestAssured.given()
                .contentType("application/json")
                .body(requestBody)
                .when()
                .post("/v1/api/products")
                .then()
                .statusCode(200)
//                .body("status", Matchers.equalTo("success"))
                .body(Matchers.equalTo("Add Product successfull"));
    }
}

