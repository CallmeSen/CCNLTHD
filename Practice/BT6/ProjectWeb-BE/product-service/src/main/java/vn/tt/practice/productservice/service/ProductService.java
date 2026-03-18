package vn.tt.practice.productservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import vn.tt.practice.productservice.dto.ProductDTO;
import vn.tt.practice.productservice.mapper.ProductMapper;
import vn.tt.practice.productservice.model.Product;
import vn.tt.practice.productservice.repository.ProductRepo;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepo productRepo;
    private final ProductMapper productMapper;

    @Cacheable(value = "products", key = "#pageable.pageNumber + '-' + #pageable.pageSize")
    public Page<ProductDTO> getAllProducts(Pageable pageable) {
        Page<Product> products = productRepo.findAll(pageable);
        return products.map(productMapper::toDTO);
    }

    @CacheEvict(value = "products", allEntries = true)
    public ProductDTO createProduct(ProductDTO productDTO) {
        Optional<Product> checkProduct = productRepo.findByProductCode(productDTO.getProductCode());
        Product saveProduct;

        if (checkProduct.isPresent())
        {
            Product product = checkProduct.get();
            product.setQuantity(product.getQuantity() + productDTO.getQuantity());
            saveProduct = productRepo.save(product);
        }else {
            saveProduct = productRepo.save(productMapper.toEntity(productDTO));
        }
        return productMapper.toDTO(saveProduct);
    }


    public ProductDTO addToCart(String id) {
        if (!productRepo.existsById(id)) {
            throw new RuntimeException("Product not found");
        }else {
            return productMapper.toDTO(productRepo.save(productRepo.findById(id).get()));
        }
    }

    public ProductDTO removeFromCart(String id) {
        if (!productRepo.existsById(id)) {
            throw new RuntimeException("Product not found");
        }else {
            productRepo.deleteById(id);
        }
        return null;
    }




}
