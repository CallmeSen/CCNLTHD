package com.nhom1.productservice.integration_test.platform;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "eureka.client.enabled=false",
        "management.endpoints.web.exposure.include=health,prometheus"
})
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("Product Platform Integration Test Cases")
public abstract class ProductPlatformIntegrationTestCases {

    @Container
    private static final MongoDBContainer MONGO_DB_CONTAINER = new MongoDBContainer("mongo:7.0");

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", MONGO_DB_CONTAINER::getReplicaSetUrl);
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("IT-ACT-01 /actuator/health should be reachable and UP")
    void shouldExposeHealthEndpoint() throws Exception {
        String response = mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(response).contains("UP");
    }

    @Test
    @DisplayName("IT-ACT-02 /actuator/prometheus should expose metrics")
    void shouldExposePrometheusEndpoint() throws Exception {
        String response = mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(response).contains("jvm_memory_used_bytes");
    }

    @Test
    @DisplayName("IT-ACT-03 metrics should increase after API calls")
    void shouldRecordHttpMetricsAfterRequests() throws Exception {
        String requestBody = """
                {
                  "name": "Metrics Test Product",
                  "description": "Metrics Test Product",
                  "price": 1000
                }
                """;

        mockMvc.perform(post("/api/product")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated());

        String prometheus = mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(prometheus).contains("http_server_requests");
    }

    @Test
    @Disabled("Requires docker compose and network checks outside Maven test scope")
    @DisplayName("IT-ENV-01 docker compose should start product-service with dependencies")
    void shouldStartWithDockerCompose() {
    }

    @Test
    @Disabled("Requires docker compose runtime environment outside JVM integration test")
    @DisplayName("IT-ENV-02 API should be accessible in docker compose environment")
    void shouldServeApiInComposeEnvironment() {
    }

    @Test
    @Disabled("Requires orchestrated restart and persistent volume checks")
    @DisplayName("IT-ENV-03 data should survive service restart when volume is configured")
    void shouldKeepDataAfterServiceRestart() {
    }
}
