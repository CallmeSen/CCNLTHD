package com.nhom1.productservice.unit_test.service;

import com.nhom1.productservice.dto.ProductRequest;
import com.nhom1.productservice.dto.ProductResponse;
import com.nhom1.productservice.model.Product;
import com.nhom1.productservice.repository.ProductRepository;
import com.nhom1.productservice.service.ProductService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Product Service Unit Test Cases")
public abstract class ProductServiceUnitTestCases {

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private ProductService productService;

    @Test
    @DisplayName("UT-SVC-01 createProduct should persist product for valid request")
    void shouldPersistProductForValidRequest() {
    ProductRequest request = ProductRequest.builder()
        .name("iPhone 13")
        .description("iPhone 13")
        .price(new BigDecimal("1200"))
        .build();

    productService.createProduct(request);

    ArgumentCaptor<Product> productCaptor = ArgumentCaptor.forClass(Product.class);
    verify(productRepository).save(productCaptor.capture());
    Product savedProduct = productCaptor.getValue();

    assertThat(savedProduct.getName()).isEqualTo("iPhone 13");
    assertThat(savedProduct.getDescription()).isEqualTo("iPhone 13");
    assertThat(savedProduct.getPrice()).isEqualByComparingTo("1200");
    }

    @Test
    @org.junit.jupiter.api.Disabled("Enable after ProductService enforces business validation for null/blank name")
    @DisplayName("UT-SVC-02 createProduct should reject null name based on business rule")
    void shouldHandleNullName() {
    // TODO(enable): remove @Disabled when ProductService validates name and throws IllegalArgumentException.
    ProductRequest request = ProductRequest.builder()
        .name(null)
        .description("iPhone 13")
        .price(new BigDecimal("1200"))
        .build();

    assertThrows(IllegalArgumentException.class, () -> productService.createProduct(request));
    }

    @Test
    @org.junit.jupiter.api.Disabled("Enable after ProductService enforces business validation for negative price")
    @DisplayName("UT-SVC-03 createProduct should reject negative price based on business rule")
    void shouldHandleNegativePrice() {
    // TODO(enable): remove @Disabled when ProductService validates price and throws IllegalArgumentException.
    ProductRequest request = ProductRequest.builder()
        .name("iPhone 13")
        .description("iPhone 13")
        .price(new BigDecimal("-1"))
        .build();

    assertThrows(IllegalArgumentException.class, () -> productService.createProduct(request));
    }

    @Test
    @DisplayName("UT-SVC-04 createProduct should handle null request")
    void shouldHandleNullRequest() {
    assertThrows(NullPointerException.class, () -> productService.createProduct(null));
    }

    @Test
    @DisplayName("UT-SVC-05 getAllProducts should return empty list when repository is empty")
    void shouldReturnEmptyListWhenRepositoryEmpty() {
    when(productRepository.findAll()).thenReturn(List.of());

    List<ProductResponse> responses = productService.getAllProducts();

    assertThat(responses).isEmpty();
    }

    @Test
    @DisplayName("UT-SVC-06 getAllProducts should map repository entities to responses")
    void shouldMapProductEntitiesToResponses() {
    Product product = Product.builder()
        .id("p1")
        .name("iPhone 13")
        .description("iPhone 13")
        .price(new BigDecimal("1200"))
        .build();
    when(productRepository.findAll()).thenReturn(List.of(product));

    List<ProductResponse> responses = productService.getAllProducts();

    assertThat(responses).hasSize(1);
    assertThat(responses.getFirst().getId()).isEqualTo("p1");
    assertThat(responses.getFirst().getName()).isEqualTo("iPhone 13");
    assertThat(responses.getFirst().getDescription()).isEqualTo("iPhone 13");
    assertThat(responses.getFirst().getPrice()).isEqualByComparingTo("1200");
    }

    @Test
    @DisplayName("UT-SVC-07 getAllProducts should preserve BigDecimal precision")
    void shouldPreserveBigDecimalPrecision() {
    Product product = Product.builder()
        .id("p1")
        .name("iPhone 13")
        .description("iPhone 13")
        .price(new BigDecimal("1200.50"))
        .build();
    when(productRepository.findAll()).thenReturn(List.of(product));

    List<ProductResponse> responses = productService.getAllProducts();

    assertThat(responses).hasSize(1);
    assertThat(responses.getFirst().getPrice()).isEqualByComparingTo("1200.50");
    }

    @Test
    @DisplayName("UT-SVC-08 createProduct should propagate repository save exception")
    void shouldPropagateSaveException() {
    ProductRequest request = ProductRequest.builder()
        .name("iPhone 13")
        .description("iPhone 13")
        .price(new BigDecimal("1200"))
        .build();

    when(productRepository.save(org.mockito.ArgumentMatchers.any(Product.class)))
        .thenThrow(new RuntimeException("save error"));

    assertThrows(RuntimeException.class, () -> productService.createProduct(request));
    }

    @Test
    @DisplayName("UT-SVC-09 getAllProducts should propagate repository read exception")
    void shouldPropagateFindAllException() {
    when(productRepository.findAll()).thenThrow(new RuntimeException("findAll error"));

    assertThrows(RuntimeException.class, () -> productService.getAllProducts());
    }
}
