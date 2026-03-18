package com.nhom1.notificationservice.listener;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.annotation.DirtiesContext;

import com.nhom1.notificationservice.dto.NotificationEvent;
import com.nhom1.notificationservice.repository.NotificationRepository;
import com.nhom1.notificationservice.service.NotificationProcessingService;

@SpringBootTest(properties = {
        "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}",
        "spring.kafka.consumer.group-id=test-notification-group",
        "spring.kafka.consumer.auto-offset-reset=earliest",
        "spring.kafka.consumer.key-deserializer=org.apache.kafka.common.serialization.StringDeserializer",
        "spring.kafka.consumer.value-deserializer=org.apache.kafka.common.serialization.StringDeserializer",
        "spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer",
        "spring.kafka.producer.value-serializer=org.apache.kafka.common.serialization.StringSerializer",
        "app.kafka.notification-topic=notificationTopic",
        "eureka.client.enabled=false",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration,org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration"
})
@EmbeddedKafka(partitions = 1, topics = "notificationTopic")
@DirtiesContext
class OrderNotificationListenerKafkaTest {

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @MockBean
    private NotificationProcessingService notificationProcessingService;

    @MockBean
    private NotificationRepository notificationRepository;

    @Test
    void shouldConsumeKafkaMessageSuccessfully() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        doAnswer(invocation -> {
            latch.countDown();
            return null;
        }).when(notificationProcessingService).processNotification(any(NotificationEvent.class));

        kafkaTemplate.send("notificationTopic", "{\"orderNumber\":\"ORD123\",\"message\":\"Order Placed Successfully\"}");

        assertTrue(latch.await(10, TimeUnit.SECONDS), "Kafka listener did not process message in time");
        verify(notificationProcessingService).processNotification(new NotificationEvent("ORD123", "Order Placed Successfully"));
    }
}
