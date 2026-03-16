package intern;

import lombok.RequiredArgsConstructor;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.KafkaContainer;
import vn.hdbank.intern.NotificationServiceApplication;
import vn.hdbank.intern.event.OrderEventConsumer;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        classes = NotificationServiceApplication.class // Load đúng context của Order Service
)
@Testcontainers
@RequiredArgsConstructor
public class NotificationServiceTest {

//    @Container
//    static KafkaContainer kafka = new KafkaContainer("bitnami/kafka:latest");
//
//    private KafkaTemplate<String, String> kafkaTemplate;
//
//    private OrderEventConsumer orderEventConsumer;
//
//    private static final String TOPIC = "order-events";
//
//    @DynamicPropertySource
//    static void configureProperties(DynamicPropertyRegistry registry) {
//        registry.add("spring.kafka.bootstrap-servers", kafkaContainer::getBootstrapServers);
//    }
//
//    @Test
//    void testReceiveValidKafkaMessage() {
//        String validMessage = "{"skuCode":"iPhone_13","price":1200,"quantity":1}";
//
//        kafkaTemplate.send(TOPIC, validMessage);
//
//        Awaitility.await()
//                .atMost(Duration.ofSeconds(5))
//                .untilAsserted(() -> {
//                    assertThat(orderEventConsumer.getLastProcessedMessage()).isEqualTo(validMessage);
//                });
//    }
//
//    @Test
//    void testHandleInvalidKafkaMessage() {
//        String invalidMessage = "Invalid JSON Format";
//
//        kafkaTemplate.send(TOPIC, invalidMessage);
//
//        Awaitility.await()
//                .atMost(Duration.ofSeconds(5))
//                .untilAsserted(() -> {
//                    assertThat(orderEventConsumer.getLastProcessedError()).contains("Failed to parse message");
//                });
//    }
}
