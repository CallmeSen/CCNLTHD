package vn.hdbank.intern.orderservice.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OrderLineItemsDTO {

    private Long id;
    @Size(max = 255, message = "Error")
    private String skuCode;
    @Size(max = 255, message = "Error")
    private BigDecimal price;
    @Size(max = 100, message = "Error")
    private Integer quantity;
}
