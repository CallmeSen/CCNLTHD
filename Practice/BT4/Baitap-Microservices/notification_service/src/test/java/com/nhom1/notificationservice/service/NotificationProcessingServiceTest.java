package com.nhom1.notificationservice.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nhom1.notificationservice.dto.NotificationEvent;
import com.nhom1.notificationservice.entity.NotificationDocument;
import com.nhom1.notificationservice.repository.NotificationRepository;

@ExtendWith(MockitoExtension.class)
class NotificationProcessingServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationProcessingService notificationProcessingService;

    @Test
    void shouldProcessNotificationAndPersistCorrectData() {
        NotificationEvent event = new NotificationEvent("ORD567", "Order Placed Successfully");

        notificationProcessingService.processNotification(event);

        ArgumentCaptor<NotificationDocument> captor = ArgumentCaptor.forClass(NotificationDocument.class);
        verify(notificationRepository).save(captor.capture());

        NotificationDocument saved = captor.getValue();
        assertEquals("ORD567", saved.getOrderNumber());
        assertEquals("Order Placed Successfully", saved.getMessage());
        assertEquals("SENT", saved.getDeliveryStatus());
        assertNotNull(saved.getCreatedAt());
    }
}
