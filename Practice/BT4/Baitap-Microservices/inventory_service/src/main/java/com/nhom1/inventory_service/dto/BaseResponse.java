package com.nhom1.inventory_service.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class BaseResponse {
    private String skuCode;
    private boolean isInStock;
    private int quantity;
}
