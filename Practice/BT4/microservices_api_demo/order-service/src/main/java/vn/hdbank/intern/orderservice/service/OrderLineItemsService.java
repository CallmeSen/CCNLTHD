package vn.hdbank.intern.orderservice.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import vn.hdbank.intern.orderservice.dto.OrderLineItemsDTO;
import vn.hdbank.intern.orderservice.mapper.OrderLineItemsMapper;
import vn.hdbank.intern.orderservice.repository.OrderLineItemsRepo;

@Service
@AllArgsConstructor
public class OrderLineItemsService {
    private final OrderLineItemsRepo orderLineItemsRepo;
    private final OrderLineItemsMapper orderLineItemsMapper;

    public OrderLineItemsDTO saveOrderLineItems(OrderLineItemsDTO orderLineItemsDTO) {
        return orderLineItemsMapper.toDTO(orderLineItemsRepo.save(orderLineItemsMapper.toEntity(orderLineItemsDTO)));
//        return orderLineItemsRepo.save(orderLineItemsMapper.toEntity(orderLineItemsDTO));
    }
}
