package vn.tt.practice.productservice.mapper;

import org.springframework.stereotype.Component;
import vn.tt.practice.productservice.dto.ProductDTO;
import vn.tt.practice.productservice.model.Product;

@Component
public class ProductMapper {

    public Product toEntity(ProductDTO productDTO) {
        return Product.builder()
                .id(productDTO.getId())
                .name(productDTO.getName())
                .price(productDTO.getPrice())
                .image(productDTO.getImage())
                .description(productDTO.getDescription())
                .checkToCart(productDTO.isCheckToCart())
                .rating(productDTO.getRating())
                .quantity(productDTO.getQuantity())
                .productCode(productDTO.getProductCode())
                .build();
    }

    public ProductDTO toDTO(Product product) {
        return ProductDTO.builder()
                .id(product.getId())
                .name(product.getName())
                .price(product.getPrice())
                .image(product.getImage())
                .description(product.getDescription())
                .rating(product.getRating())
                .checkToCart(product.isCheckToCart())
                .quantity(product.getQuantity())
                .productCode(product.getProductCode())
                .build();
    }
}
