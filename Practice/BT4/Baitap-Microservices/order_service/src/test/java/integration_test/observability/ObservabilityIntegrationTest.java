package integration_test.observability;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.nhom1.order_service.OrderServiceApplication;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Integration Test - Observability and Discovery")
@SpringBootTest(classes = OrderServiceApplication.class)
@AutoConfigureMockMvc
class ObservabilityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private Environment environment;

    @Test
    @DisplayName("IT-OBS-01 should expose actuator health endpoint")
    void should_expose_actuator_health_endpoint() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    @Disabled("Enable when prometheus actuator endpoint is exposed in test profile")
    @DisplayName("IT-OBS-02 should expose actuator prometheus endpoint")
    void should_expose_actuator_prometheus_endpoint() throws Exception {
        // TODO(enable): remove @Disabled after management endpoint exposure includes prometheus in test configuration.
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk());
    }

    @Test
    @Disabled("Enable when eureka registration properties are provided in test environment")
    @DisplayName("IT-OBS-03 should register service into eureka server")
    void should_register_service_into_eureka_server() {
        // TODO(enable): remove @Disabled after spring.application.name and eureka.defaultZone are set for integration tests.
        assertEquals("order-service", environment.getProperty("spring.application.name"));
        String defaultZone = environment.getProperty("eureka.client.service-url.defaultZone");
        assertTrue(defaultZone != null && defaultZone.contains("8761/eureka"));
    }
}
