package vn.hdbank.intern.productservice.controller;

import lombok.AllArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;
import vn.hdbank.intern.productservice.dto.BaseResponse;
import vn.hdbank.intern.productservice.dto.ProductDTO;
import vn.hdbank.intern.productservice.model.Product;
import vn.hdbank.intern.productservice.repository.ProductRepo;
import vn.hdbank.intern.productservice.service.ProductService;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/v1/api/product")
@AllArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping("")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<BaseResponse> createProduct(@RequestBody ProductDTO product) {
        productService.createProduct(product);
        return ResponseEntity.ok().body(BaseResponse.builder()
                .status("success")
                .message("Add Product success")
                .build());
    }

    @GetMapping("")
    @ResponseStatus(HttpStatus.OK)
    public ResponseEntity<List<ProductDTO>> getAllProducts() {
        return ResponseEntity.ok().body(productService.getAllProducts());
    }


}
