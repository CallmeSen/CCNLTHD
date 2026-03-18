# Microservices Demo Monorepo

Đây là workspace thực hành backend theo kiến trúc microservices, tổ chức theo Maven multi-module.

Các service chính trong bản thử nghiệm:

- `eureka_server` (Service Discovery)
- `gateway_service` (API Gateway)
- `inventory_service`
- `order_service`
- `product_service`
- `notification_service`

Hạ tầng đi kèm trong Docker Compose:

- PostgreSQL
- MySQL
- MongoDB
- Kafka + Zookeeper
- Zipkin

## 1. Cấu trúc thư mục thực tế

```text
Baitap-Microservices/
├── pom.xml
├── compose.yaml
├── docker/
├── eureka_server/
├── gateway_service/
├── inventory_service/
├── order_service/
├── product_service/
├── notification_service/
├── Requirement_handout/
└── README.md
```

## 2. Yêu cầu môi trường

- JDK 21
- Maven 3.9+
- Docker Desktop
- PowerShell (khuyến nghị trên Windows)

## 3. Quick Start (khuyến nghị)

### 3.1 Build toàn bộ module

```powershell
cd D:\CCNLTHD\Practice\BT4\Baitap-Microservices
mvn clean package -DskipTests
```

### 3.2 Chạy toàn bộ hệ thống bằng Docker Compose

```powershell
docker compose up -d --build
```

### 3.3 Kiểm tra nhanh hệ thống

```powershell
docker compose ps
```

Các endpoint quan trọng:

- Eureka: `http://localhost:8761`
- Gateway health: `http://localhost:8080/actuator/health`
- Inventory health: `http://localhost:8081/actuator/health`
- Order health: `http://localhost:8082/actuator/health`
- Product health: `http://localhost:8083/actuator/health`
- Notification health: `http://localhost:8084/actuator/health`
- Zipkin: `http://localhost:9411`

## 4. Chạy bằng Docker (chi tiết)

### 4.1 Chạy các service hạ tầng trước

```powershell
docker compose up -d postgres mysql mongodb zookeeper kafka zipkin eureka-server
```

### 4.2 Chạy các service nghiệp vụ sau

```powershell
docker compose up -d inventory-service product-service gateway-service notification-service order-service
```

### 4.3 Xem logs

```powershell
docker compose logs -f eureka-server
docker compose logs -f gateway-service
docker compose logs -f inventory-service
docker compose logs -f order-service
docker compose logs -f product-service
docker compose logs -f notification-service
```

### 4.4 Dừng hệ thống

```powershell
docker compose down
```

Reset cả data volume:

```powershell
docker compose down -v
```

## 5. Chạy riêng từng service (local bằng Maven)

Lưu ý quan trọng:

- Một số module đang phụ thuộc mạnh vào biến môi trường từ `compose.yaml`.
- Nếu chạy local riêng lẻ, bạn nên set biến môi trường tương ứng trước khi `spring-boot:run`.
- Luôn chạy `eureka_server` trước, sau đó `gateway_service`, rồi các service nghiệp vụ.

### 5.1 Eureka Server (port 8761)

```powershell
cd D:\CCNLTHD\Practice\BT4\Baitap-Microservices\eureka_server
mvn spring-boot:run
```

### 5.2 Gateway Service (port 8080)

```powershell
cd D:\CCNLTHD\Practice\BT4\Baitap-Microservices\gateway_service
$env:EUREKA_SERVER_URL = "http://localhost:8761/eureka"
mvn spring-boot:run
```

### 5.3 Inventory Service (port 8081)

```powershell
cd D:\CCNLTHD\Practice\BT4\Baitap-Microservices\inventory_service
$env:EUREKA_SERVER_URL = "http://localhost:8761/eureka"
$env:INVENTORY_DB_URL = "jdbc:postgresql://localhost:5432/inventory_db"
$env:INVENTORY_DB_USERNAME = "inventory_user"
$env:INVENTORY_DB_PASSWORD = "inventory_password"
$env:SPRING_KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
mvn spring-boot:run
```

### 5.4 Product Service (port 8083)

```powershell
cd D:\CCNLTHD\Practice\BT4\Baitap-Microservices\product_service
$env:EUREKA_SERVER_URL = "http://localhost:8761/eureka"
$env:PRODUCT_MONGO_URI = "mongodb://product_user:product_password@localhost:27017/product_db?authSource=admin"
mvn spring-boot:run
```

### 5.5 Notification Service (port 8084)

```powershell
cd D:\CCNLTHD\Practice\BT4\Baitap-Microservices\notification_service
$env:EUREKA_SERVER_URL = "http://localhost:8761/eureka"
$env:SPRING_KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
$env:NOTIFICATION_MONGO_URI = "mongodb://product_user:product_password@localhost:27017/notification_db?authSource=admin"
$env:APP_KAFKA_NOTIFICATION_TOPIC = "notificationTopic"
mvn spring-boot:run
```

### 5.6 Order Service (port 8082)

```powershell
cd D:\CCNLTHD\Practice\BT4\Baitap-Microservices\order_service
$env:EUREKA_SERVER_URL = "http://localhost:8761/eureka"
$env:ORDER_DB_URL = "jdbc:mysql://localhost:3306/order_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:ORDER_DB_USERNAME = "root"
$env:ORDER_DB_PASSWORD = "root"
$env:KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
$env:INVENTORY_SERVICE_URL = "http://localhost:8080"
mvn spring-boot:run
```

## 6. Chạy chung không Docker (multi-terminal)

Thứ tự khởi động khuyến nghị:

1. `eureka_server`
2. Hạ tầng local (Postgres, MySQL, MongoDB, Kafka, Zipkin)
3. `inventory_service`, `product_service`, `notification_service`
4. `gateway_service`
5. `order_service`

## 7. Lệnh test/build theo từng service

Tại thư mục gốc `Baitap-Microservices`:

```powershell
mvn -pl eureka_server test
mvn -pl gateway_service test
mvn -pl inventory_service test
mvn -pl order_service test
mvn -pl product_service test
mvn -pl notification_service test
```

Build từng module:

```powershell
mvn -pl eureka_server clean package
mvn -pl gateway_service clean package
mvn -pl inventory_service clean package
mvn -pl order_service clean package
mvn -pl product_service clean package
mvn -pl notification_service clean package
```

## 8. API kiểm tra nhanh

### 8.1 Product Service

Tạo sản phẩm:

```powershell
$body = @{name="iPhone 13"; description="iPhone 13"; price=1200} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://localhost:8083/api/product -ContentType "application/json" -Body $body
```

Lấy danh sách sản phẩm:

```powershell
Invoke-RestMethod -Uri http://localhost:8083/api/product
```

### 8.2 Inventory Service

Kiểm tra tồn kho:

```powershell
Invoke-RestMethod -Uri "http://localhost:8081/api/inventory?skuCode=IP13"
```

### 8.3 Order Service

Tạo đơn hàng:

```powershell
$order = @{
      orderLineItemsDtoList = @(
            @{ skuCode = "IP13"; price = 1200; quantity = 1 }
      )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method POST -Uri http://localhost:8082/api/order -ContentType "application/json" -Body $order
```

## 9. Ghi chú vận hành

- Trong môi trường Docker, các URL service nội bộ dùng tên service (`eureka-server`, `kafka`, `mongodb`, `mysql`, `postgres`).
- Trong môi trường local, dùng `localhost` và đúng port map.
- Nếu thấy cảnh báo Eureka kiểu `Connection refused`, thường là thứ tự khởi động chưa đúng hoặc URL Eureka chưa khớp môi trường.
- Với bản thử nghiệm hiện tại, chạy bằng Docker Compose là cách ổn định và nhanh nhất.