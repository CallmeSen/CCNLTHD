package vn.tt.practice.productservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(value = "productDB")
@Builder
@Data
@AllArgsConstructor
public class Product {
    @Id
    private String id;

    private String name;
    private double price;
    private String description;
    private String image;
    private boolean checkToCart;
    private Integer rating;
    private Integer quantity;
    private String productCode;

}
