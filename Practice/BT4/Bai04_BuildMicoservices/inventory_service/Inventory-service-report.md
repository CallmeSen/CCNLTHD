# Inventory Service — Requirements vs Implementation

Generated: 2026-03-18

## Summary
This report compares the project implementation with the requirements in `doc_inven.md`.

## Requirements checklist

1) Spring Boot application with dependencies
- Status: PARTIAL — present via parent POM
  - Present: `spring-boot-starter-web`, `spring-boot-starter-actuator`, `io.micrometer:micrometer-registry-prometheus`, `micrometer-tracing-bridge-brave`, `spring-cloud-starter-netflix-eureka-client`, `lombok`, JPA starter (module POMs: see parent `pom.xml` and module `pom.xml`).
  - Notes: Zipkin exporter dependency not explicitly present; Micrometer tracing bridge is included.

2) Database configuration (MySQL or PostgreSQL)
- Status: PRESENT
  - `src/main/resources/application.properties` has Postgres config:
    - `spring.datasource.url=jdbc:postgresql://localhost:5432/inventory`
    - `spring.datasource.username`, `spring.datasource.password`
  - JPA is configured: `spring.jpa.hibernate.ddl-auto=update`

3) REST API to check inventory
- Status: PARTIAL
  - Implemented endpoint: `GET /v1/api/inventory?skuCode=...` in `controller/InventoryController.java`
  - Response: single `BaseResponse` with fields `skuCode`, `isInStock`, `quantity` (class `dto/BaseResponse.java`).
  - Requirement expected: `GET /api/inventory` accepting a list of `skuCode` and returning an array. Current implementation accepts a single `skuCode` and returns one object.

4) Model Inventory and JPA repository
- Status: PRESENT
  - `model/Inventory.java` with fields `id`, `skuCode`, `quantity`.
  - `repository/InventoryRepo.java` extends `JpaRepository` and exposes `existsBySkuCode` and `findBySkuCode`.

5) Eureka integration
- Status: PRESENT
  - `application.properties` contains:
    - `eureka.client.serviceUrl.defaultZone=http://localhost:8761/eureka/`
    - `eureka.client.register-with-eureka=true`

6) Actuator and Prometheus
- Status: PARTIAL
  - Dependencies present in parent POM (`spring-boot-starter-actuator`, Micrometer Prometheus). `management.tracing.sampling.probability=0` is set.
  - Missing/unclear: no explicit `management.endpoints.web.exposure.include` property found to expose `/actuator/health` and `/actuator/prometheus` (default exposure may not include prometheus). Recommend adding explicit exposure config.

7) Unit test & integration tests
- Status: MISSING / MINIMAL
  - Only `src/test/java/.../InventoryServiceApplicationTests.java` with context load test exists.
  - No unit tests for API behavior (check in-stock success / not found) and no integration tests. JaCoCo is configured to require 80% coverage, but current tests will not meet that.

8) Docker
- Status: PRESENT (but minor mismatch)
  - `Dockerfile` exists and builds `target/inventory-service-0.0.1-SNAPSHOT.jar`, exposes port `8081`.
  - `application.properties` sets `server.port=8083` — port mismatch between Dockerfile and app config.
  - There's a `docker-compose.yml` in the sibling folder `inventory-service/` (root of other module), but no compose in this module.

## Files mapped to requirements (key files)

- Application bootstrap: `InventoryServiceApplication.java`
- Controller: `src/main/java/.../controller/InventoryController.java`
- Service: `src/main/java/.../service/InventoryService.java`
- Repository: `src/main/java/.../repository/InventoryRepo.java`
- Model: `src/main/java/.../model/Inventory.java`
- DTOs: `src/main/java/.../dto/BaseResponse.java`, `InventoryDTO.java`
- Configs: `src/main/resources/application.properties`, `config/RestemplateConfig.java`, `config/SecurityConfig.java`
- Docker: `Dockerfile`
- Tests: `src/test/java/.../InventoryServiceApplicationTests.java`
- Build: module `pom.xml` and parent `pom.xml` (dependencies & jacoco)

## Missing or recommended changes

1. API shape: update `InventoryController` to accept a list of `skuCode` and return an array of `BaseResponse` to match requirement GET `/api/inventory`.
2. Tests: add unit tests for success and not-found scenarios, plus an integration test that uses an in-memory DB (H2) or Testcontainers to verify the API. Aim for the 80% coverage required by JaCoCo.
3. Actuator exposure: add to `application.properties`:
   - `management.endpoints.web.exposure.include=health,info,prometheus`
   - `management.endpoint.prometheus.enabled=true`
4. Zipkin: if Zipkin tracing is required, add the exporter dependency (e.g., `io.zipkin.reporter2:zipkin-reporter-brave` or use Spring Cloud Sleuth/Zipkin starter) and configure `spring.zipkin.base-url`.
5. Docker port: align `Dockerfile` EXPOSE port with `server.port` (or remove hard-coded `server.port` and let Docker use the default 8080).
6. Package names: VERIFIED OK in this module. Java files under `src/main/java/com/nhom1/inventory_service/**` and `src/test/java/com/nhom1/inventory_service/**` consistently declare `com.nhom1.inventory_service.*`. No `vn.hdbank.intern.inventoryservice.*` declarations were found.

## Quick next steps I can run for you

- Update `InventoryController` to support list of skuCodes and return array.
- Add example unit tests for `InventoryService` and controller.
- Add actuator exposure properties and fix Dockerfile port.

If you want, I can apply these code changes now (starting with the API response shape and actuator config). Tell me which change(s) to prioritize.

---
Report generated by assistant.
