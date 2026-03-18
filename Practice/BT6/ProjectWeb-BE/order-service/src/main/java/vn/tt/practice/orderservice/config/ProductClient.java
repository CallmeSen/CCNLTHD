package vn.tt.practice.orderservice.config;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "product-service")
public interface ProductClient {

    @PutMapping("/v1/api/products/{id}/decrease-quantity")
    ResponseEntity<String> decreaseQuantity(@PathVariable("id") String productId,
                                            @RequestParam("amount") int amount);
}

