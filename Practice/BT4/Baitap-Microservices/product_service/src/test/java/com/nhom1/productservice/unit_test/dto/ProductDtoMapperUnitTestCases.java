package com.nhom1.productservice.unit_test.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nhom1.productservice.dto.ProductRequest;
import com.nhom1.productservice.model.Product;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Product DTO Mapper Unit Test Cases")
public abstract class ProductDtoMapperUnitTestCases {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("UT-DTO-01 ProductRequest should serialize and deserialize consistently")
    void shouldSerializeAndDeserializeProductRequest() throws Exception {
    ProductRequest request = ProductRequest.builder()
        .name("iPhone 13")
        .description("iPhone 13")
        .price(new BigDecimal("1200.50"))
        .build();

    String json = objectMapper.writeValueAsString(request);
    ProductRequest parsed = objectMapper.readValue(json, ProductRequest.class);

    assertThat(parsed.getName()).isEqualTo("iPhone 13");
    assertThat(parsed.getDescription()).isEqualTo("iPhone 13");
    assertThat(parsed.getPrice()).isEqualByComparingTo("1200.50");
    }

    @Test
    @DisplayName("UT-MDL-01 Product builder should map fields correctly")
    void shouldBuildProductModelCorrectly() {
    Product product = Product.builder()
        .id("p1")
        .name("iPhone 13")
        .description("iPhone 13")
        .price(new BigDecimal("1200"))
        .build();

    assertThat(product.getId()).isEqualTo("p1");
    assertThat(product.getName()).isEqualTo("iPhone 13");
    assertThat(product.getDescription()).isEqualTo("iPhone 13");
    assertThat(product.getPrice()).isEqualByComparingTo("1200");
    }
}
