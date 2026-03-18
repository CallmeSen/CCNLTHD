# Hướng dẫn triển khai `gateway-service`

Tài liệu này hướng dẫn cách chạy `gateway-service` theo 2 cách:

- Chạy local bằng Maven
- Chạy cùng toàn hệ thống bằng Docker Compose

---

## 1) Mục tiêu và chức năng của Gateway

`gateway-service` là cổng vào của hệ thống microservices, có nhiệm vụ:

- Định tuyến request theo path:
	- `/api/product/**` -> `product-service`
	- `/api/order/**` -> `order-service`
	- `/api/inventory/**` -> `inventory-service`
- Tìm service động thông qua Eureka Discovery Server
- Expose endpoint monitoring:
	- `/actuator/health`
	- `/actuator/prometheus`

---

## 2) Cấu hình hiện tại (đã áp dụng)

Trong `src/main/resources/application.properties`:

- `spring.application.name=api-gateway`
- `server.port=8080`
- `eureka.client.serviceUrl.defaultZone=http://localhost:8761/eureka`
- Route dùng `lb://...` để resolve qua Eureka

> Lưu ý: key `serviceUrl.defaultZone` dùng camelCase (đúng với Eureka map property).

---

## 3) Chạy local bằng Maven

### 3.1. Điều kiện

- Java 21
- Maven 3.x
- Eureka server đang chạy ở `http://localhost:8761`
- Các service đích (`product-service`, `order-service`, `inventory-service`) đã đăng ký lên Eureka

### 3.2. Lệnh chạy

```bash
cd Practice/BT4/Baitap-Microservices/gateway_service
mvn clean package
mvn spring-boot:run
```

### 3.3. Kiểm tra nhanh

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/prometheus
```

Kiểm tra route (ví dụ):

```bash
curl http://localhost:8080/api/product
curl http://localhost:8080/api/order
curl http://localhost:8080/api/inventory
```

---

## 4) Triển khai bằng Docker Compose (khuyến nghị)

Project đã có service `gateway-service` trong file `compose.yaml` ở thư mục `Baitap-Microservices`.

### 4.1. Chạy toàn bộ hệ thống

```bash
cd Practice/BT4/Baitap-Microservices
docker compose up -d --build
```

### 4.2. Kiểm tra container

```bash
docker compose ps
docker compose logs -f gateway-service
```

### 4.3. Endpoint sau khi chạy compose

- Eureka Dashboard: `http://localhost:8761`
- Gateway: `http://localhost:8080`
- Health: `http://localhost:8080/actuator/health`
- Prometheus metrics: `http://localhost:8080/actuator/prometheus`

---

## 5) Dockerfile của Gateway

File `gateway_service/Dockerfile`:

- Base image: `eclipse-temurin:21-jre`
- Copy jar: `target/gateway_service-0.0.1-SNAPSHOT.jar`
- Expose port: `8080`
- Start command: `java -jar /app/app.jar`

Để build/running riêng gateway bằng Docker:

```bash
cd Practice/BT4/Baitap-Microservices/gateway_service
mvn clean package
docker build -t gateway-service:local .
docker run --rm -p 8080:8080 --name gateway-service gateway-service:local
```

> Cách này yêu cầu Eureka và các service backend có thể truy cập được từ container gateway.

---

## 6) Các lỗi thường gặp

### Lỗi `Connection refused` tới `localhost:8761`

Nguyên nhân:
- Eureka chưa chạy
- Chạy gateway trước Eureka

Cách xử lý:
- Khởi động `eureka-server` trước
- Hoặc dùng Docker Compose để start đồng bộ

### Gateway chạy nhưng route trả lỗi 5xx

Nguyên nhân:
- Service đích chưa đăng ký Eureka
- Sai `spring.application.name` ở service đích

Cách xử lý:
- Vào `http://localhost:8761` kiểm tra service đã `UP`
- Đảm bảo tên service trùng với route URI (`product-service`, `order-service`, `inventory-service`)

---

## 7) Checklist nộp bài

- [x] Có cấu hình route `/api/product/**`, `/api/order/**`, `/api/inventory/**`
- [x] Dùng Eureka discovery với `eureka.client.serviceUrl.defaultZone`
- [x] Expose `/actuator/health` và `/actuator/prometheus`
- [x] Có `Dockerfile` cho gateway
- [x] Có `gateway-service` trong `compose.yaml`

