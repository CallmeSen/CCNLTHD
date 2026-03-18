package com.nhom1.inventory_service.integration_test.platform;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Integration - Platform and observability")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class InventoryPlatformIntegrationTestCases {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("IT-08 should expose actuator health endpoint with status UP")
    void shouldExposeActuatorHealthEndpoint() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @Disabled("Temporarily skipped by QA decision: Prometheus endpoint not required in current phase")
    @DisplayName("IT-09 should expose prometheus metrics endpoint")
    void shouldExposePrometheusMetricsEndpoint() throws Exception {
        // Re-enable when /actuator/prometheus is officially exposed in runtime config.
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("jvm_memory_used_bytes")));
    }

    @Test
    @Disabled("Requires a running Eureka server to verify runtime registration")
    @DisplayName("IT-10 should register inventory service to eureka")
    void shouldRegisterServiceToEureka() {
    }

    @Test
    @Disabled("Requires docker compose environment in integration pipeline")
    @DisplayName("IT-11 should run inventory service with database and eureka by docker compose")
    void shouldRunWithDockerCompose() {
    }

    @Test
    @Disabled("Requires running Zipkin backend to assert traces")
    @DisplayName("IT-14 should create traces that can be found in zipkin")
    void shouldCreateZipkinTraces() {
    }
}
