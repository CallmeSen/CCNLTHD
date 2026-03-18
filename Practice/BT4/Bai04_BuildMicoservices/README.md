# Microservices Demo Monorepo

Dự án này là hệ thống microservices sử dụng Spring Boot theo mô hình Maven multi-module (monorepo), gồm:

- inventory-service
- order-service
- product-service
- eureka-server (service discovery)

## 1. Cấu trúc thư mục

```text
Bai04_BuildMicoservices/
├── pom.xml                          # Parent POM (multi-module)
├── compose.yaml                     # Docker Compose cho toàn bộ hệ thống
├── docker/
│   └── postgres/
│       └── init.sql                 # Tạo DB/user cho inventory và order
├── eureka_server/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
├── inventory_service/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
├── order_service/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
└── product_service/
            ├── pom.xml
            ├── Dockerfile
            └── src/
```

## 2. Dependencies chung cho 3 service

Các dependency chung được đặt trong Parent POM để tất cả service kế thừa:

- Spring Web
- Lombok
- Spring Boot Actuator
- Micrometer Registry Prometheus
- Micrometer Tracing Bridge Brave (Zipkin)
- Spring Cloud Eureka Client
- Spring Data Commons
- Spring Boot Test

Thông tin quản lý phiên bản chung:

- Java 21
- Spring Boot 3.3.5
- Spring Cloud BOM 2023.0.3

## 3. Dependencies riêng theo service

### 3.1 Order Service

Trong module order_service:

- spring-boot-starter-data-jpa
- spring-kafka
- spring-cloud-starter-circuitbreaker-resilience4j
- postgresql (runtime)
- mysql-connector-j (runtime)

Cấu hình riêng:

- spring.application.name=order-service
- Kafka topic thông báo: app.kafka.notification-topic=notificationTopic
- Resilience4j cho inventoryService:
      - circuit breaker
      - retry
      - timeout
- URL gọi Inventory: inventory.service.base-url

### 3.2 Inventory Service

Trong module inventory_service:

- spring-boot-starter-data-jpa
- postgresql (runtime)
- mysql-connector-j (runtime)

Cấu hình riêng:

- spring.application.name=inventory-service

### 3.3 Product Service

Trong module product_service:

- spring-boot-starter-data-mongodb

Cấu hình riêng:

- spring.application.name=product-service
- spring.data.mongodb.uri

Lưu ý xung đột yêu cầu SQL/Mongo:

- Tài liệu gốc mô tả Product vừa dùng PostgreSQL vừa dùng MongoDB.
- Cấu hình hiện tại đã chọn MongoDB làm mặc định vì phù hợp mô tả MongoRepository và Docker Compose có MongoDB.
- Nếu nhóm chốt SQL, cần đổi dependency của product_service sang JPA và cập nhật application.properties + compose.

## 4. Cấu hình chung áp dụng đồng bộ toàn repo

### 4.1 Eureka Discovery

Mặc định tất cả service đăng ký về:

- http://localhost:8761/eureka

Trong code, giá trị này được parameter hóa bằng biến môi trường:

- EUREKA_SERVER_URL

### 4.2 Observability

Tất cả service đều bật:

- /actuator/health
- /actuator/prometheus

Cấu hình truy vết:

- management.tracing.sampling.probability=1.0
- management.zipkin.tracing.endpoint qua biến ZIPKIN_ENDPOINT

### 4.3 Docker và Docker Compose

Mỗi module có Dockerfile riêng:

- eureka_server/Dockerfile
- inventory_service/Dockerfile
- order_service/Dockerfile
- product_service/Dockerfile

File compose.yaml khởi tạo:

- eureka-server
- zipkin
- zookeeper
- kafka
- postgres
- mysql
- mongodb
- inventory-service
- order-service
- product-service

### 4.4 Testing và coverage

Tất cả service có test class context load.

Yêu cầu tối thiểu 80% coverage cho Inventory và Order được cấu hình bằng JaCoCo check tại:

- inventory_service/pom.xml
- order_service/pom.xml

Lưu ý:

- Nếu code nghiệp vụ chưa đủ, JaCoCo có thể fail khi chạy verify.
- Cần bổ sung unit test/integration test API để đạt ngưỡng 80% thực tế.

## 5. Các file cấu hình chính

### 5.1 Parent POM

File: pom.xml

Vai trò:

- Quản lý modules
- Quản lý dependency version (Spring Cloud BOM)
- Cung cấp dependency chung cho các child module
- Cung cấp plugin management (Spring Boot plugin, JaCoCo)

### 5.2 Service properties

- inventory_service/src/main/resources/application.properties
- order_service/src/main/resources/application.properties
- product_service/src/main/resources/application.properties
- eureka_server/src/main/resources/application.properties

Tất cả đã được chuẩn hóa theo tên service dạng kebab-case và endpoint observability.

## 6. Cách chạy dự án

### Bước 1: Build tất cả module

Tại thư mục gốc Bai04_BuildMicoservices:

```bash
mvn clean package
```

### Bước 2: Khởi động hệ thống bằng Docker Compose

```bash
docker compose up --build
```

### Bước 3: Kiểm tra nhanh

- Eureka Dashboard: http://localhost:8761
- Zipkin: http://localhost:9411
- Inventory health: http://localhost:8081/actuator/health
- Order health: http://localhost:8082/actuator/health
- Product health: http://localhost:8083/actuator/health
- Prometheus metrics:
      - http://localhost:8081/actuator/prometheus
      - http://localhost:8082/actuator/prometheus
      - http://localhost:8083/actuator/prometheus

## 7. Ghi chú vận hành

- Hiện tại compose có cả MySQL và PostgreSQL để phục vụ yêu cầu bài tập linh hoạt.
- Inventory và Order đang cấu hình mặc định trên PostgreSQL.
- Nếu chuyển sang MySQL, cập nhật lại INVENTORY_DB_URL và ORDER_DB_URL trong compose hoặc biến môi trường runtime.
- Tiếp theo nên bổ sung API thực tế và test Unit/Integration cho từng endpoint để đảm bảo đạt KPI coverage 80% đúng yêu cầu đề bài.