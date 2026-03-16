package vn.tt.practice.orderservice.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import vn.tt.practice.productservice.dto.ProductDTO;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@Document(value = "orderDB")
public class Order {

    @Id
    private String id;

    private List<ProductDTO> items;
    private int totalItemCount;
    private String delivery_type;
    private double delivery_type_cost;
    private double cost_before_delivery_rate;
    private double cost_after_delivery_rate;
    private String promo_code;
    private String contact_number;
    private String user_id;

//    @JsonProperty("payment_method")
    private String paymentMethod;

    private String status;


}
