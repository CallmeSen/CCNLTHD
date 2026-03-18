# Huong Dan Trien Khai Notification Service

Tai lieu nay huong dan trien khai va kiem thu Notification Service trong he thong microservices.

## 1. Muc Tieu

Notification Service thuc hien:

- Nhan su kien don hang tu Kafka topic `notificationTopic`
- Xu ly noi dung thong bao
- Luu thong bao vao MongoDB
- Gia lap gui email xac nhan
- Dang ky voi Eureka
- Ho tro theo doi qua endpoint:
  - `/actuator/health`
  - `/actuator/prometheus`

## 2. Cau Hinh Chinh

### 2.1 Service

- Service name: `notification-service`
- Port: `8084`
- Kafka topic: `notificationTopic`
- Consumer group: `notification-group`

### 2.2 Bien Moi Truong (Docker Compose)

Notification service dang su dung cac bien moi truong:

- `EUREKA_SERVER_URL=http://eureka-server:8761/eureka`
- `ZIPKIN_ENDPOINT=http://zipkin:9411/api/v2/spans`
- `SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092`
- `NOTIFICATION_MONGO_URI=mongodb://product_user:product_password@mongodb:27017/notification_db?authSource=admin`
- `APP_KAFKA_NOTIFICATION_TOPIC=notificationTopic`

## 3. Yeu Cau He Thong

Can cai dat:

- Java 21
- Maven 3.9+
- Docker Desktop (hoac Docker Engine + Compose)

## 4. Trien Khai Bang Docker Compose

Tu thu muc goc:

`Practice/BT4/Baitap-Microservices`

### 4.1 Build artifact

```powershell
cd d:\CCNLTHD\Practice\BT4\Baitap-Microservices\notification_service
.\mvnw.cmd clean package -DskipTests
```

### 4.2 Khoi dong cac service phu thuoc va notification-service

```powershell
cd d:\CCNLTHD\Practice\BT4\Baitap-Microservices
docker compose up -d --build zookeeper kafka mongodb zipkin eureka-server notification-service
```

### 4.3 Kiem tra container

```powershell
docker compose ps
```

Service can co trang thai `Up`:

- `eureka-server`
- `kafka`
- `mongodb`
- `notification-service`

## 5. Kiem Tra Endpoint Actuator va Prometheus

### 5.1 Health check

```powershell
curl.exe -i http://localhost:8084/actuator/health
```

Ky vong:

- HTTP `200`
- JSON co `"status":"UP"`

### 5.2 Prometheus metrics

```powershell
curl.exe http://localhost:8084/actuator/prometheus
```

Ky vong:

- Co du lieu text metrics, vi du:
  - `application_started_time_seconds`
  - `disk_free_bytes`
  - `executor_active_threads`

## 6. Kiem Thu End-to-End Kafka -> MongoDB

### 6.1 Gui message vao Kafka

#### Cach 1: JSON (dung theo de bai)

```powershell
docker exec -i microservices-demo-kafka-1 bash -c "echo '{\"orderNumber\":\"ORD2001\",\"message\":\"Order Placed Successfully\"}' | kafka-console-producer --bootstrap-server kafka:9092 --topic notificationTopic"
```

#### Cach 2: Legacy format (tuong thich voi order-service hien tai)

```powershell
docker exec -i microservices-demo-kafka-1 bash -c "echo 'Order Placed: ORD2002' | kafka-console-producer --bootstrap-server kafka:9092 --topic notificationTopic"
```

### 6.2 Kiem tra log notification-service

```powershell
docker compose logs --tail=200 notification-service
```

Ky vong co cac dong log:

- `Received event from Kafka topic notificationTopic`
- `Processing notification for orderNumber=...`
- `[EMAIL_SIMULATION] Confirmation email sent for orderNumber=...`

### 6.3 Kiem tra du lieu trong MongoDB

```powershell
docker exec microservices-demo-mongodb-1 mongosh --quiet -u product_user -p product_password --authenticationDatabase admin --eval "db.getSiblingDB('notification_db').notifications.find({}, {orderNumber:1, message:1, deliveryStatus:1, _id:0}).toArray()"
```

Ky vong:

- Co ban ghi moi voi:
  - `orderNumber`
  - `message`
  - `deliveryStatus: 'SENT'`

## 7. Chay Notification Service Khong Docker (Local)

Neu muon chay rieng service tren may:

```powershell
cd d:\CCNLTHD\Practice\BT4\Baitap-Microservices\notification_service
.\mvnw.cmd spring-boot:run
```

Can dam bao da co:

- Eureka tai `localhost:8761`
- Kafka tai `localhost:9092`
- MongoDB va user/phien dang nhap hop le

## 8. Thu Muc va File Quan Trong

- Cau hinh app: `src/main/resources/application.properties`
- Kafka listener: `src/main/java/com/nhom1/notificationservice/listener/OrderNotificationListener.java`
- Xu ly nghiep vu: `src/main/java/com/nhom1/notificationservice/service/NotificationProcessingService.java`
- Mongo entity: `src/main/java/com/nhom1/notificationservice/entity/NotificationDocument.java`
- Docker image: `Dockerfile`

## 9. Xu Ly Su Co Thuong Gap

### 9.1 Loi ket noi Eureka luc moi khoi dong

Neu thay `Connection refused` trong vai giay dau, day la hien tuong thuong gap khi eureka-server chua san sang. Service se tu retry va dang ky sau.

### 9.2 Khong thay du lieu trong Mongo

Kiem tra:

- Message da duoc gui dung topic `notificationTopic`
- URI Mongo (`NOTIFICATION_MONGO_URI`) dung username/password/database
- Log co dong `Processing notification` hay chua

### 9.3 Endpoint actuator bi 404

Kiem tra da build lai JAR va rebuild image sau khi thay doi cau hinh:

```powershell
cd d:\CCNLTHD\Practice\BT4\Baitap-Microservices\notification_service
.\mvnw.cmd clean package -DskipTests

cd d:\CCNLTHD\Practice\BT4\Baitap-Microservices
docker compose build --no-cache notification-service
docker compose up -d notification-service
```
