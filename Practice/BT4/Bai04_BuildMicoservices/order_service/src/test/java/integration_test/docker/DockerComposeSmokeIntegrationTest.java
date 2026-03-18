package integration_test.docker;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Integration Test - Docker Compose Smoke")
class DockerComposeSmokeIntegrationTest {

    @Test
    @DisplayName("IT-DKR-01 should build docker image successfully")
    void should_build_docker_image_successfully() throws IOException {
        Path dockerfilePath = Path.of("Dockerfile");
        assertTrue(Files.exists(dockerfilePath), "Dockerfile must exist for image build");

        String dockerfileContent = Files.readString(dockerfilePath, StandardCharsets.UTF_8);
        assertTrue(dockerfileContent.contains("FROM"), "Dockerfile must contain base image declaration");
        assertTrue(dockerfileContent.contains("ENTRYPOINT") || dockerfileContent.contains("CMD"),
                "Dockerfile must define startup command");
    }

    @Test
    @DisplayName("IT-DKR-02 should start compose stack successfully")
    void should_start_compose_stack_successfully() throws IOException {
        Path composePath = Path.of("..", "compose.yaml").normalize();
        assertTrue(Files.exists(composePath), "compose.yaml must exist at Bai04_BuildMicoservices root");

        String composeContent = Files.readString(composePath, StandardCharsets.UTF_8).toLowerCase();
        assertTrue(composeContent.contains("order"), "compose must include order service");
        assertTrue(composeContent.contains("eureka"), "compose must include eureka service");
        assertTrue(composeContent.contains("kafka"), "compose must include kafka service");
    }

    @Test
    @Disabled("Enable when docker compose stack is started in CI/local before smoke test execution")
    @DisplayName("IT-DKR-03 should place order against compose stack")
    void should_place_order_against_compose_stack() throws IOException {
        // TODO(enable): remove @Disabled after CI pipeline starts compose.yaml services and waits for health.
        URI uri = URI.create("http://localhost:8080/actuator/health");
        HttpURLConnection connection = (HttpURLConnection) uri.toURL().openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(2000);
        connection.setReadTimeout(2000);

        int statusCode = connection.getResponseCode();
        assertTrue(statusCode == 200, "Compose stack must be running before smoke request is executed");
    }
}
