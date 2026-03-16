package vn.hdbank.intern.productservice.repository;

import org.mapstruct.Mapper;
import org.springframework.stereotype.Component;
import vn.hdbank.intern.productservice.dto.ProductDTO;
import vn.hdbank.intern.productservice.model.Product;

//@Mapper(componentModel = "spring")
@Component
public class ProductMapper {
//    ProductDTO toProductDTO(Product product);
//
//    Product toProduct(ProductDTO productDTO);
    public ProductDTO toProductDTO(Product product) {
        if (product == null) {
            return null;
        }
        return new ProductDTO(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice()
        );
    }

        public Product toProduct(ProductDTO productDTO) {
            if (productDTO == null) {
                return null;
            }
            return new Product(
                    productDTO.getId(),
                    productDTO.getName(),
                    productDTO.getDescription(),
                    productDTO.getPrice()
            );
        }
}
