# Service Structures - Baitap-Microservices

Tai lieu nay tong hop cau truc cua 4 service da yeu cau:
- eureka_server
- inventory_service
- order_service
- product_service

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

## Ghi chu
- Cac thu muc `target/` la output build, co the thay doi theo moi lan `mvn clean package`.
- Neu ban muon, minh co the xuat them 1 ban "src-only" (bo target) de doc gon hon cho tai lieu hoc tap.
