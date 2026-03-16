package vn.hdbank.intern.orderservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.hdbank.intern.orderservice.model.Order;

@Repository
public interface OrderRepo extends JpaRepository<Order, Long> {
}
