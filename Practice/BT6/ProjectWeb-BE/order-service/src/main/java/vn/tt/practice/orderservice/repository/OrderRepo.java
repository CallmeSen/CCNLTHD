package vn.tt.practice.orderservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import vn.tt.practice.orderservice.model.Order;

@Repository
public interface OrderRepo extends MongoRepository<Order, String> {
//    Optional<Order> findById(String id);




}

