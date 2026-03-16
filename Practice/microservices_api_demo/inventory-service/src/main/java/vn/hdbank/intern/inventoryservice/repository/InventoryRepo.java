package vn.hdbank.intern.inventoryservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.web.bind.annotation.RequestParam;
import vn.hdbank.intern.inventoryservice.model.Inventory;

import java.util.Optional;

@Repository
public interface InventoryRepo extends JpaRepository<Inventory, Long> {
    boolean existsBySkuCode(String skuCode);

    Optional<Inventory> findBySkuCode(String skuCode);



}
