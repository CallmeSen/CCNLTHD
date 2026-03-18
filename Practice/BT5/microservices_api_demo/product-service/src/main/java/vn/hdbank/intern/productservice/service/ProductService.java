package vn.hdbank.intern.productservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import vn.hdbank.intern.productservice.dto.ProductDTO;
import vn.hdbank.intern.productservice.model.Product;
import vn.hdbank.intern.productservice.repository.ProductMapper;
import vn.hdbank.intern.productservice.repository.ProductRepo;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {
    private final ProductMapper productMapper;
    private final ProductRepo productRepo;

    @CacheEvict(value = "products", allEntries = true)
    public ProductDTO createProduct(ProductDTO product) {
        log.info("Product created");
        return productMapper.toProductDTO(productRepo.save(productMapper.toProduct(product)));

    }

    @Cacheable(value = "products")
    public List<ProductDTO> getAllProducts() {

        return productRepo.findAll()
                .stream()
                .map(productMapper::toProductDTO).collect(Collectors.toList());

    }
}
