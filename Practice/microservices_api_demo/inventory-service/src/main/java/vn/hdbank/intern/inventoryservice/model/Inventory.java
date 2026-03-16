package vn.hdbank.intern.inventoryservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name="inventory")
//@RedisHash
public class Inventory {
    @Id
    @GeneratedValue
    private Long id;
    @Column(name ="sku_code")
    private String skuCode;
    @Column(name="quantity")
    private Integer quantity;
}
