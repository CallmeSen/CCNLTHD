package com.nhom1.productservice.unit_test.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nhom1.productservice.controller.ProductController;
import com.nhom1.productservice.dto.ProductRequest;
import com.nhom1.productservice.dto.ProductResponse;
import com.nhom1.productservice.service.ProductService;
import jakarta.servlet.ServletException;
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

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Product Controller Unit Test Cases")
public abstract class ProductControllerUnitTestCases {

    @Mock
    private ProductService productService;

    @InjectMocks
    private ProductController productController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(productController).build();
    objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("UT-CTL-01 POST /api/product should delegate to service and return 201")
    void shouldCreateProductSuccessfully() throws Exception {
    ProductRequest request = ProductRequest.builder()
        .name("iPhone 13")
        .description("iPhone 13")
        .price(new BigDecimal("1200"))
        .build();

    mockMvc.perform(post("/api/product")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated());

    verify(productService).createProduct(any(ProductRequest.class));
    }

    @Test
    @DisplayName("UT-CTL-02 GET /api/product should return product list with 200")
    void shouldReturnAllProducts() throws Exception {
    List<ProductResponse> responses = List.of(
        ProductResponse.builder()
            .id("p1")
            .name("iPhone 13")
            .description("iPhone 13")
            .price(new BigDecimal("1200"))
            .build(),
        ProductResponse.builder()
            .id("p2")
            .name("Samsung S24")
            .description("Samsung S24")
            .price(new BigDecimal("1100"))
            .build()
    );
    when(productService.getAllProducts()).thenReturn(responses);

    mockMvc.perform(get("/api/product"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value("p1"))
        .andExpect(jsonPath("$[0].name").value("iPhone 13"))
        .andExpect(jsonPath("$[1].id").value("p2"));
    }

    @Test
    @DisplayName("UT-CTL-03 GET /api/product should return empty list when no data")
    void shouldReturnEmptyListWhenNoProducts() throws Exception {
    when(productService.getAllProducts()).thenReturn(List.of());

    mockMvc.perform(get("/api/product"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @DisplayName("UT-CTL-04 POST /api/product should return 400 for malformed JSON")
    void shouldReturnBadRequestForMalformedJson() throws Exception {
    mockMvc.perform(post("/api/product")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"iPhone 13\",\"price\":"))
        .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("UT-CTL-05 POST /api/product should map service exception to 5xx until advice exists")
    void shouldHandleServiceException() throws Exception {
    ProductRequest request = ProductRequest.builder()
        .name("iPhone 13")
        .description("iPhone 13")
        .price(new BigDecimal("1200"))
        .build();

    doThrow(new RuntimeException("Unexpected service error"))
        .when(productService)
        .createProduct(any(ProductRequest.class));

    ServletException exception = assertThrows(ServletException.class, () ->
        mockMvc.perform(post("/api/product")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
    );

    assertThat(exception.getMessage()).contains("Unexpected service error");
    }
}
