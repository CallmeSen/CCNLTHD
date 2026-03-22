# Service Structures - Baitap-Microservices

Tai lieu nay tong hop cau truc cua 6 service da yeu cau:
- eureka_server
- inventory_service
- order_service
- product_service
- notification_service
- gateway_service

## 1) eureka_server

### Chuc nang cau truc
- `src/main/java`: app bootstrap cho service discovery.
- `src/main/resources`: cau hinh runtime (ten service, port, eureka settings).
- `src/test/java`: smoke test/co ban test cho app.
- `target`: artifact sau khi build (`.jar`, class da bien dich, metadata maven).

### Cay thu muc
```text
 eureka_server/
 |-- Dockerfile
 |-- pom.xml
 |-- src/
 |   |-- main/
 |   |   |-- java/com/nhom1/eureka_server/
 |   |   |   `-- EurekaServerApplication.java
 |   |   `-- resources/
 |   |       `-- application.properties
 |   `-- test/
 |       `-- java/com/nhom1/eureka_server/
 |           `-- EurekaServerApplicationTests.java
 `-- target/
     |-- eureka-server-0.0.1-SNAPSHOT.jar
     |-- eureka-server-0.0.1-SNAPSHOT.jar.original
     |-- classes/
     |   |-- application.properties
     |   `-- com/nhom1/eureka_server/EurekaServerApplication.class
     |-- generated-sources/
     |-- generated-test-sources/
     |-- maven-archiver/pom.properties
     |-- maven-status/
     `-- test-classes/com/nhom1/eureka_server/EurekaServerApplicationTests.class
```

## 2) inventory_service

### Chuc nang cau truc
- `config`: security/cross-cutting config.
- `controller`: REST API cho inventory.
- `dto`: object request/response.
- `model`: entity/domain object inventory.
- `repository`: truy cap DB + mapper.
- `service`: business logic inventory.
- `src/test`: unit test va integration test theo tung layer.
- `target`: artifact build + generated source + compiled test classes.

### Cay thu muc
```text
 inventory_service/
 |-- .gitattributes
 |-- .gitignore
 |-- docker-compose.yml
 |-- Dockerfile
 |-- doc_inven.md
 |-- Inventory-service-report.md
 |-- mvnw
 |-- mvnw.cmd
 |-- pom.xml
 |-- RUNNING.md
 |-- TEST_SCENARIOS_INVENTORY_SERVICE.md
 |-- yeucau.md
 |-- .mvn/wrapper/maven-wrapper.properties
 |-- src/
 |   |-- main/
 |   |   |-- java/com/nhom1/inventory_service/
 |   |   |   |-- InventoryServiceApplication.java
 |   |   |   |-- config/SecurityConfig.java
 |   |   |   |-- controller/InventoryController.java
 |   |   |   |-- dto/BaseResponse.java
 |   |   |   |-- dto/InventoryDTO.java
 |   |   |   |-- model/Inventory.java
 |   |   |   |-- repository/InventoryMapper.java
 |   |   |   |-- repository/InventoryRepo.java
 |   |   |   `-- service/InventoryService.java
 |   |   `-- resources/
 |   |       |-- application.properties
 |   |       `-- banner.txt
 |   `-- test/
 |       |-- java/com/nhom1/inventory_service/
 |       |   |-- InventoryServiceApplicationTests.java
 |       |   |-- integration_test/api/InventoryApiIntegrationTestCases.java
 |       |   |-- integration_test/platform/InventoryPlatformIntegrationTestCases.java
 |       |   |-- unit_test/controller/InventoryControllerUnitTestCases.java
 |       |   |-- unit_test/dto/InventoryDtoMapperUnitTestCases.java
 |       |   |-- unit_test/repository/InventoryRepositoryUnitTestCases.java
 |       |   `-- unit_test/service/InventoryServiceUnitTestCases.java
 |       `-- resources/
 |           |-- application-test.properties
 |           `-- application.properties
 `-- target/
     |-- inventory-service-0.0.1-SNAPSHOT.jar
     |-- inventory-service-0.0.1-SNAPSHOT.jar.original
     |-- classes/
     |   |-- application.properties
     |   |-- banner.txt
     |   `-- com/nhom1/inventory_service/... (controller,dto,model,repository,service)
     |-- generated-sources/annotations/com/nhom1/inventory_service/repository/InventoryMapperImpl.java
     |-- generated-test-sources/
     |-- maven-archiver/pom.properties
     |-- maven-status/
     `-- test-classes/com/nhom1/inventory_service/... (integration_test, unit_test)
```

## 3) order_service

### Chuc nang cau truc
- `config`: cau hinh client/ket noi external service.
- `controller`: API tao don va lay thong tin don.
- `domain`: entity order va line item.
- `dto`: payload request/response cho API.
- `exception`: xu ly loi nghiep vu + global handler.
- `integration`: client goi inventory-service.
- `listener`: producer phat event order.
- `repository`: truy cap DB cho order.
- `service` + `service/impl`: nghiep vu dat hang va query order.
- `src/test`: unit, integration, e2e, observability tests.

### Cay thu muc
```text
 order_service/
 |-- .gitattributes
 |-- .gitignore
 |-- Dockerfile
 |-- mvnw
 |-- mvnw.cmd
 |-- pom.xml
 |-- RUN_COMMANDS.md
 |-- TEST_SCENARIOS_ORDER_SERVICE.md
 |-- yeucau.md
 |-- .mvn/wrapper/maven-wrapper.properties
 |-- src/
 |   |-- main/
 |   |   |-- java/com/nhom1/order_service/
 |   |   |   |-- OrderServiceApplication.java
 |   |   |   |-- config/InventoryClientConfig.java
 |   |   |   |-- controller/OrderController.java
 |   |   |   |-- domain/Order.java
 |   |   |   |-- domain/OrderLineItems.java
 |   |   |   |-- dto/ApiMessageResponse.java
 |   |   |   |-- dto/CreateOrderLineItemRequest.java
 |   |   |   |-- dto/CreateOrderRequest.java
 |   |   |   |-- dto/OrderLineItemResponse.java
 |   |   |   |-- dto/OrderResponse.java
 |   |   |   |-- exception/ApiError.java
 |   |   |   |-- exception/GlobalExceptionHandler.java
 |   |   |   |-- exception/InventoryServiceUnavailableException.java
 |   |   |   |-- exception/OutOfStockException.java
 |   |   |   |-- exception/ResourceNotFoundException.java
 |   |   |   |-- integration/InventoryServiceClient.java
 |   |   |   |-- listener/OrderEventProducer.java
 |   |   |   |-- repository/OrderRepository.java
 |   |   |   |-- service/OrderService.java
 |   |   |   `-- service/impl/OrderServiceImpl.java
 |   |   `-- resources/application.properties
 |   `-- test/
 |       |-- java/com/nhom1/order_service/OrderServiceApplicationTests.java
 |       |-- java/integration_test/api/OrderApiIntegrationTest.java
 |       |-- java/integration_test/docker/DockerComposeSmokeIntegrationTest.java
 |       |-- java/integration_test/e2e/OrderFlowIntegrationTest.java
 |       |-- java/integration_test/observability/ObservabilityIntegrationTest.java
 |       |-- java/unit_test/controller/OrderControllerUnitTest.java
 |       |-- java/unit_test/exception/GlobalExceptionHandlerUnitTest.java
 |       |-- java/unit_test/integration/InventoryServiceClientUnitTest.java
 |       |-- java/unit_test/service/OrderServiceImplUnitTest.java
 |       `-- resources/application.properties
 `-- target/
     |-- order-service-0.0.1-SNAPSHOT.jar
     |-- order-service-0.0.1-SNAPSHOT.jar.original
     |-- classes/com/nhom1/order_service/... (config,controller,domain,dto,exception,integration,listener,repository,service)
     |-- generated-sources/
     |-- generated-test-sources/
     |-- maven-archiver/pom.properties
     |-- maven-status/
     `-- test-classes/... (integration_test, unit_test)
```

## 4) product_service

### Chuc nang cau truc
- `controller`: API tao san pham, lay danh sach san pham.
- `dto`: request/response object cho product API.
- `model`: entity product.
- `repository`: truy cap data product.
- `service`: xu ly nghiep vu product.
- `src/test`: unit + integration tests.
- `target`: artifact sau build va class da bien dich.

### Cay thu muc
```text
 product_service/
 |-- .gitattributes
 |-- .gitignore
 |-- Dockerfile
 |-- mvnw
 |-- mvnw.cmd
 |-- pom.xml
 |-- RUN_COMMANDS.md
 |-- TEST_SCENARIOS_PRODUCT_SERVICE.md
 |-- yeucau.md
 |-- .mvn/wrapper/maven-wrapper.properties
 |-- src/
 |   |-- main/
 |   |   `-- java/com/nhom1/productservice/
 |   |       |-- ProductServiceApplication.java
 |   |       |-- controller/ProductController.java
 |   |       |-- dto/ProductRequest.java
 |   |       |-- dto/ProductResponse.java
 |   |       |-- model/Product.java
 |   |       |-- repository/ProductRepository.java
 |   |       `-- service/ProductService.java
 |   `-- test/
 |       |-- java/ProductServiceApplicationTests.java
 |       |-- java/com/nhom1/productservice/integration_test/api/ProductApiIntegrationTestCases.java
 |       |-- java/com/nhom1/productservice/integration_test/platform/ProductPlatformIntegrationTestCases.java
 |       |-- java/com/nhom1/productservice/unit_test/controller/ProductControllerUnitTestCases.java
 |       |-- java/com/nhom1/productservice/unit_test/dto/ProductDtoMapperUnitTestCases.java
 |       |-- java/com/nhom1/productservice/unit_test/repository/ProductRepositoryUnitTestCases.java
 |       |-- java/com/nhom1/productservice/unit_test/service/ProductServiceUnitTestCases.java
 |       `-- resources/application.properties
 `-- target/
     |-- product-service-0.0.1-SNAPSHOT.jar
     |-- product-service-0.0.1-SNAPSHOT.jar.original
     |-- classes/com/nhom1/productservice/... (controller,dto,model,repository,service)
     |-- generated-sources/
     |-- generated-test-sources/
     |-- maven-archiver/pom.properties
     |-- maven-status/
     `-- test-classes/com/nhom1/productservice/... (integration_test, unit_test)
```

## 5) notification_service

### Chuc nang cau truc
- `dto`: kieu du lieu event thong bao nhan tu message bus.
- `entity`: document luu thong bao trong MongoDB.
- `listener`: consumer nhan event dat hang tu Kafka.
- `repository`: thao tac luu/truy van document thong bao.
- `service`: xu ly nghiep vu thong bao (persist + ghi log gui email mo phong).
- `src/test`: test cho listener va service.
- `target`: artifact build (`.jar`, metadata maven, compiled classes).

### Cay thu muc
```text
 notification_service/
 |-- .gitattributes
 |-- .gitignore
 |-- Dockerfile
 |-- docs.md
 |-- mvnw
 |-- mvnw.cmd
 |-- pom.xml
 |-- yeucau.md
 |-- .mvn/wrapper/maven-wrapper.properties
 |-- src/
 |   |-- main/
 |   |   |-- java/com/nhom1/notificationservice/
 |   |   |   |-- NotificationServiceApplication.java
 |   |   |   |-- dto/NotificationEvent.java
 |   |   |   |-- entity/NotificationDocument.java
 |   |   |   |-- listener/OrderNotificationListener.java
 |   |   |   |-- repository/NotificationRepository.java
 |   |   |   `-- service/NotificationProcessingService.java
 |   |   `-- resources/application.properties
 |   `-- test/
 |       `-- java/com/nhom1/notificationservice/
 |           |-- NotificationServiceApplicationTests.java
 |           |-- listener/OrderNotificationListenerKafkaTest.java
 |           `-- service/NotificationProcessingServiceTest.java
 `-- target/
     |-- notification-service-0.0.1-SNAPSHOT.jar
     |-- notification-service-0.0.1-SNAPSHOT.jar.original
     |-- classes/
     |-- generated-sources/annotations/
     |-- generated-test-sources/test-annotations/
     |-- maven-archiver/pom.properties
     |-- maven-status/
     `-- test-classes/
```

## 6) gateway_service

### Chuc nang cau truc
- `Application`: bootstrap cho API Gateway.
- `LoggingFilter`: global filter ghi log request/response va thoi gian xu ly.
- `resources/application.properties`: khai bao route (path -> service), eureka registration, actuator.
- `src/test`: test startup/co ban cho gateway app.
- `target`: artifact build (`.jar`, metadata maven, compiled classes).

### Cay thu muc
```text
 gateway_service/
 |-- .gitattributes
 |-- .gitignore
 |-- Dockerfile
 |-- docs.md
 |-- mvnw
 |-- mvnw.cmd
 |-- pom.xml
 |-- .mvn/wrapper/maven-wrapper.properties
 |-- src/
 |   |-- main/
 |   |   |-- java/com/example/gateway_service/
 |   |   |   |-- Application.java
 |   |   |   `-- LoggingFilter.java
 |   |   `-- resources/application.properties
 |   `-- test/
 |       |-- java/com/example/gateway_service/ApplicationTests.java
 |       `-- resources/application.properties
 `-- target/
     |-- gateway_service-0.0.1-SNAPSHOT.jar
     |-- gateway_service-0.0.1-SNAPSHOT.jar.original
     |-- classes/
     |-- generated-sources/annotations/
     |-- generated-test-sources/test-annotations/
     |-- maven-archiver/pom.properties
     |-- maven-status/
     `-- test-classes/
```

## Ghi chu
- Cac thu muc `target/` la output build, co the thay doi theo moi lan `mvn clean package`.
- Neu ban muon, minh co the xuat them 1 ban "src-only" (bo target) de doc gon hon cho tai lieu hoc tap.

## 7) Danh sach test da cai dat (loc theo nhom)

Tong so test source file: 28 (`src/test/**/*.java`).

### eureka_server
- Smoke/Application:
    - `eureka_server/src/test/java/com/nhom1/eureka_server/EurekaServerApplicationTests.java`

### gateway_service
- Smoke/Application:
    - `gateway_service/src/test/java/com/example/gateway_service/ApplicationTests.java`

### inventory_service
- Integration:
    - `inventory_service/src/test/java/com/nhom1/inventory_service/integration_test/api/InventoryApiIntegrationTestCases.java`
    - `inventory_service/src/test/java/com/nhom1/inventory_service/integration_test/platform/InventoryPlatformIntegrationTestCases.java`
- Unit:
    - `inventory_service/src/test/java/com/nhom1/inventory_service/unit_test/controller/InventoryControllerUnitTestCases.java`
    - `inventory_service/src/test/java/com/nhom1/inventory_service/unit_test/dto/InventoryDtoMapperUnitTestCases.java`
    - `inventory_service/src/test/java/com/nhom1/inventory_service/unit_test/repository/InventoryRepositoryUnitTestCases.java`
    - `inventory_service/src/test/java/com/nhom1/inventory_service/unit_test/service/InventoryServiceUnitTestCases.java`
- Smoke/Application:
    - `inventory_service/src/test/java/com/nhom1/inventory_service/InventoryServiceApplicationTests.java`

### notification_service
- Integration (Kafka listener):
    - `notification_service/src/test/java/com/nhom1/notificationservice/listener/OrderNotificationListenerKafkaTest.java`
- Unit:
    - `notification_service/src/test/java/com/nhom1/notificationservice/service/NotificationProcessingServiceTest.java`
- Smoke/Application:
    - `notification_service/src/test/java/com/nhom1/notificationservice/NotificationServiceApplicationTests.java`

### order_service
- Integration API:
    - `order_service/src/test/java/integration_test/api/OrderApiIntegrationTest.java`
- Integration E2E:
    - `order_service/src/test/java/integration_test/e2e/OrderFlowIntegrationTest.java`
- Integration Smoke (Docker):
    - `order_service/src/test/java/integration_test/docker/DockerComposeSmokeIntegrationTest.java`
- Integration Observability:
    - `order_service/src/test/java/integration_test/observability/ObservabilityIntegrationTest.java`
- Unit:
    - `order_service/src/test/java/unit_test/controller/OrderControllerUnitTest.java`
    - `order_service/src/test/java/unit_test/exception/GlobalExceptionHandlerUnitTest.java`
    - `order_service/src/test/java/unit_test/integration/InventoryServiceClientUnitTest.java`
    - `order_service/src/test/java/unit_test/service/OrderServiceImplUnitTest.java`
- Smoke/Application:
    - `order_service/src/test/java/com/nhom1/order_service/OrderServiceApplicationTests.java`

### product_service
- Integration:
    - `product_service/src/test/java/com/nhom1/productservice/integration_test/api/ProductApiIntegrationTestCases.java`
    - `product_service/src/test/java/com/nhom1/productservice/integration_test/platform/ProductPlatformIntegrationTestCases.java`
- Unit:
    - `product_service/src/test/java/com/nhom1/productservice/unit_test/controller/ProductControllerUnitTestCases.java`
    - `product_service/src/test/java/com/nhom1/productservice/unit_test/dto/ProductDtoMapperUnitTestCases.java`
    - `product_service/src/test/java/com/nhom1/productservice/unit_test/repository/ProductRepositoryUnitTestCases.java`
    - `product_service/src/test/java/com/nhom1/productservice/unit_test/service/ProductServiceUnitTestCases.java`
- Smoke/Application:
    - `product_service/src/test/java/ProductServiceApplicationTests.java`

## 8) Ket qua chay `mvn clean test` va ly do PASS/FAIL/SKIPPED

### Tong quan reactor
- Lenh chay: `mvn clean test` tai root `Baitap-Microservices`.
- Ket qua chung: `BUILD FAILURE`.
- Reactor summary:
    - `microservices-demo`: SUCCESS
    - `inventory-service`: SUCCESS
    - `order-service`: FAILURE
    - `product-service`: SKIPPED
    - `eureka-server`: SKIPPED
    - `gateway-service`: SKIPPED
    - `notification-service`: SKIPPED

### Ket qua chi tiet theo test suite da thuc thi

#### inventory_service (PASS)
- `com.nhom1.inventory_service.InventoryServiceApplicationTests$IntegrationApi`: tests=10, failures=0, errors=0, skipped=2
- `com.nhom1.inventory_service.InventoryServiceApplicationTests$IntegrationPlatform`: tests=6, failures=0, errors=0, skipped=4
- `com.nhom1.inventory_service.InventoryServiceApplicationTests$UnitControllerLayer`: tests=4, failures=0, errors=0, skipped=1
- `com.nhom1.inventory_service.InventoryServiceApplicationTests$UnitDtoMapperLayer`: tests=1, failures=0, errors=0, skipped=0
- `com.nhom1.inventory_service.InventoryServiceApplicationTests$UnitRepositoryLayer`: tests=2, failures=0, errors=0, skipped=0
- `com.nhom1.inventory_service.InventoryServiceApplicationTests$UnitServiceLayer`: tests=8, failures=0, errors=0, skipped=3
- `com.nhom1.inventory_service.InventoryServiceApplicationTests`: tests=0, failures=0, errors=0, skipped=0
- Tong module: tests=31, failures=0, errors=0, skipped=10

#### order_service (FAIL)
- `unit_test.controller.OrderControllerUnitTest`: tests=6, failures=0, errors=0, skipped=0
- `unit_test.service.OrderServiceImplUnitTest`: tests=8, failures=0, errors=0, skipped=0
- `unit_test.integration.InventoryServiceClientUnitTest`: tests=5, failures=1, errors=0, skipped=0
- `unit_test.exception.GlobalExceptionHandlerUnitTest`: tests=4, failures=0, errors=0, skipped=0
- `integration_test.e2e.OrderFlowIntegrationTest`: tests=5, failures=0, errors=0, skipped=1
- `integration_test.docker.DockerComposeSmokeIntegrationTest`: tests=3, failures=0, errors=0, skipped=1
- `integration_test.observability.ObservabilityIntegrationTest`: tests=3, failures=0, errors=0, skipped=2
- `integration_test.api.OrderApiIntegrationTest`: tests=6, failures=0, errors=0, skipped=0
- `com.nhom1.order_service.OrderServiceApplicationTests`: tests=0, failures=0, errors=0, skipped=0
- Tong module: tests=40, failures=1, errors=0, skipped=4

### Vi sao PASS
- Mot test/suite duoc xem la PASS khi `failures=0` va `errors=0` trong surefire report.
- Cac suite PASS o inventory va phan lon suite o order thoa dieu kien tren.

### Vi sao FAIL
- Co 1 test fail duy nhat:
    - `unit_test.integration.InventoryServiceClientUnitTest.should_return_false_when_map_indicates_out_of_stock`
    - Assertion message: `expected: <false> but was: <true>`
- Vi test fail trong module `order-service`, Maven dung reactor tai module nay va danh dau build that bai.

### Vi sao SKIPPED
- SKIPPED cap testcase (do chu dong bo qua trong test code/profile):
    - Inventory:
        - `shouldReturnBadRequestWhenSkuCodeBlank`: Business decision: blank skuCode is currently accepted
        - `shouldReturnServerErrorWhenDatabaseUnavailable`: Requires fault injection setup to force database outage at runtime
        - `shouldCreateZipkinTraces`: Requires running Zipkin backend to assert traces
        - `shouldRunWithDockerCompose`: Requires docker compose environment in integration pipeline
        - `shouldExposePrometheusMetricsEndpoint`: Temporarily skipped by QA decision
        - `shouldRegisterServiceToEureka`: Requires a running Eureka server
        - `shouldFailValidationForEmptySkuList`: Temporarily skipped by QA decision
        - `shouldFailValidationWhenSkuContainsNull`: Temporarily skipped by QA decision
        - `shouldFailValidationForBlankSkuValue`: Business decision: blank skuCode is currently accepted
    - Order:
        - `should_place_order_against_compose_stack`: Enable when docker compose stack is started in CI/local
        - `should_recover_with_retry_when_inventory_transient_failure_occurs`: Enable when retry/fallback flow duoc bat trong test env
        - `should_register_service_into_eureka_server`: Enable when eureka registration properties duoc cung cap
        - `should_expose_actuator_prometheus_endpoint`: Enable when prometheus actuator endpoint duoc expose trong test profile
- SKIPPED cap module (reactor):
    - `product-service`, `eureka-server`, `gateway-service`, `notification-service` bi skip vi Maven dung sau khi `order-service` fail.