package vn.tt.practice.productservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import vn.tt.practice.productservice.model.Product;

import java.util.Optional;

@Repository
public interface ProductRepo extends MongoRepository<Product, String> {
    Optional<Product> findByProductCode(String productCode);

}
