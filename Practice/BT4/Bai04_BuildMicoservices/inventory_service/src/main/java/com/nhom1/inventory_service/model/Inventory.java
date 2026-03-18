package com.nhom1.inventory_service.model;

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
public class Inventory {
    @Id
    @GeneratedValue
    private Long id;
    @Column(name ="sku_code")
    private String skuCode;
    @Column(name="quantity")
    private Integer quantity;
}
