package com.nhom1.productservice.integration_test.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nhom1.productservice.model.Product;
import com.nhom1.productservice.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
    "eureka.client.enabled=false",
    "management.endpoints.web.exposure.include=health,prometheus"
})
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("Product API Integration Test Cases")
public abstract class ProductApiIntegrationTestCases {

    @Container
    private static final MongoDBContainer MONGO_DB_CONTAINER = new MongoDBContainer("mongo:7.0");

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", MONGO_DB_CONTAINER::getReplicaSetUrl);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void cleanDatabase() {
        productRepository.deleteAll();
    }

    @Test
    @DisplayName("IT-API-01 POST /api/product should create product and return 201")
    void shouldCreateProduct() throws Exception {
        String requestBody = """
            {
              "name": "iPhone 13",
              "description": "iPhone 13",
              "price": 1200
            }
            """;

        mockMvc.perform(post("/api/product")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isCreated());

        assertThat(productRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("IT-API-02 GET /api/product should return created products")
    void shouldGetAllProductsAfterCreate() throws Exception {
        productRepository.save(Product.builder()
                .name("iPhone 13")
                .description("iPhone 13")
                .price(new BigDecimal("1200"))
                .build());

        mockMvc.perform(get("/api/product"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("iPhone 13"));
    }

    @Test
    @DisplayName("IT-API-03 GET /api/product should return empty list for empty database")
    void shouldReturnEmptyListForEmptyDatabase() throws Exception {
        mockMvc.perform(get("/api/product"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @DisplayName("IT-API-04 API should handle multiple product creations")
    void shouldHandleMultipleCreates() throws Exception {
                for (int i = 1; i <= 3; i++) {
                        String requestBody = """
                                        {
                                            "name": "Product-%d",
                                            "description": "Description-%d",
                                            "price": 1000
                                        }
                                        """.formatted(i, i);

                        mockMvc.perform(post("/api/product")
                                                        .contentType(MediaType.APPLICATION_JSON)
                                                        .content(requestBody))
                                        .andExpect(status().isCreated());
                }

                mockMvc.perform(get("/api/product"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0]").exists())
                                .andExpect(jsonPath("$[1]").exists())
                                .andExpect(jsonPath("$[2]").exists());
    }

    @Test
    @org.junit.jupiter.api.Disabled("Enable after API enforces business validation for negative price")
    @DisplayName("IT-API-05 POST /api/product should reject negative price by business rule")
    void shouldValidateNegativePrice() throws Exception {
        // TODO(enable): remove @Disabled when POST /api/product returns 400 for negative price.
        String requestBody = """
            {
              "name": "iPhone 13",
              "description": "iPhone 13",
              "price": -1
            }
            """;

        mockMvc.perform(post("/api/product")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest());
    }

    @Test
    @org.junit.jupiter.api.Disabled("Enable after API enforces business validation for blank name")
    @DisplayName("IT-API-06 POST /api/product should reject blank name by business rule")
    void shouldValidateBlankName() throws Exception {
        // TODO(enable): remove @Disabled when POST /api/product returns 400 for blank name.
        String requestBody = """
            {
              "name": "",
              "description": "iPhone 13",
              "price": 1200
            }
            """;

        mockMvc.perform(post("/api/product")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest());
    }

    @Test
    @org.junit.jupiter.api.Disabled("Enable after API enforces business validation for required fields")
    @DisplayName("IT-API-07 POST /api/product should reject missing required fields")
    void shouldValidateMissingFields() throws Exception {
        // TODO(enable): remove @Disabled when POST /api/product returns 400 for missing fields.
        String requestBody = """
            {
              "name": "iPhone 13",
              "description": "iPhone 13"
            }
            """;

        mockMvc.perform(post("/api/product")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("IT-API-08 POST /api/product should reject unsupported media type")
    void shouldRejectUnsupportedMediaType() throws Exception {
        mockMvc.perform(post("/api/product")
                .contentType(MediaType.TEXT_PLAIN)
                .content("name=iPhone"))
            .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    @DisplayName("IT-API-09 MongoDB should generate id for saved product")
    void shouldGenerateProductId() throws Exception {
        String requestBody = """
            {
              "name": "iPhone 13",
              "description": "iPhone 13",
              "price": 1200
            }
            """;

        mockMvc.perform(post("/api/product")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isCreated());

        Product saved = productRepository.findAll().getFirst();
        assertThat(saved.getId()).isNotBlank();
    }

    @Test
    @DisplayName("IT-API-10 API should preserve decimal precision for price")
    void shouldPreservePricePrecision() throws Exception {
                String requestBody = """
                                {
                                    "name": "iPhone 13",
                                    "description": "iPhone 13",
                                    "price": 1200.50
                                }
                                """;

                mockMvc.perform(post("/api/product")
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(requestBody))
                                .andExpect(status().isCreated());

                String responseContent = mockMvc.perform(get("/api/product"))
                                .andExpect(status().isOk())
                                .andReturn()
                                .getResponse()
                                .getContentAsString();

                JsonNode root = objectMapper.readTree(responseContent);
                BigDecimal actualPrice = root.get(0).get("price").decimalValue();
                assertThat(actualPrice).isEqualByComparingTo("1200.50");
        }
}
