package com.nhom1.productservice.unit_test.repository;

import com.nhom1.productservice.model.Product;
import com.nhom1.productservice.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataMongoTest
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("Product Repository Unit Test Cases")
public abstract class ProductRepositoryUnitTestCases {

    @Container
    private static final MongoDBContainer MONGO_DB_CONTAINER = new MongoDBContainer("mongo:7.0");

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", MONGO_DB_CONTAINER::getReplicaSetUrl);
    }

    @Autowired
    private ProductRepository productRepository;

    @BeforeEach
    void cleanDatabase() {
        productRepository.deleteAll();
    }

    @Test
    @DisplayName("UT-REP-01 repository should persist and read product document")
    void shouldPersistAndReadProduct() {
        Product product = Product.builder()
                .name("iPhone 13")
                .description("iPhone 13")
                .price(new BigDecimal("1200"))
                .build();

        Product savedProduct = productRepository.save(product);
        List<Product> allProducts = productRepository.findAll();

        assertThat(savedProduct.getId()).isNotBlank();
        assertThat(allProducts).hasSize(1);
        assertThat(allProducts.getFirst().getName()).isEqualTo("iPhone 13");
        assertThat(allProducts.getFirst().getPrice()).isEqualByComparingTo("1200");
    }

    @Test
    @DisplayName("UT-REP-02 repository should return empty list when collection is empty")
    void shouldReturnEmptyList() {
        List<Product> allProducts = productRepository.findAll();

        assertThat(allProducts).isEmpty();
    }
}
