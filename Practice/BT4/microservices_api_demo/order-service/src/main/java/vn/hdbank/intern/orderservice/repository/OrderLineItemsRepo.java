package vn.hdbank.intern.orderservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.CrudRepository;
import vn.hdbank.intern.orderservice.model.OrderLineItems;

import java.util.List;

public interface OrderLineItemsRepo extends JpaRepository<OrderLineItems, Long> {
}
