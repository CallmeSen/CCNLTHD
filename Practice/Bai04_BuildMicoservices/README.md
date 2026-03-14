# Microservices Demo Monorepo

Du an nay la he thong microservices su dung Spring Boot theo mo hinh Maven multi-module (monorepo), gom:

- inventory-service
- order-service
- product-service
- eureka-server (service discovery)

## 1. Cau truc thu muc

```text
Bai04_BuildMicoservices/
├── pom.xml                          # Parent POM (multi-module)
├── compose.yaml                     # Docker Compose cho toan bo he thong
├── docker/
│   └── postgres/
│       └── init.sql                 # Tao DB/user cho inventory va order
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

Cac dependency chung duoc dat trong Parent POM de tat ca service ke thua:

- Spring Web
- Lombok
- Spring Boot Actuator
- Micrometer Registry Prometheus
- Micrometer Tracing Bridge Brave (Zipkin)
- Spring Cloud Eureka Client
- Spring Data Commons
- Spring Boot Test

Thong tin quan ly phien ban chung:

- Java 21
- Spring Boot 3.3.5
- Spring Cloud BOM 2023.0.3

## 3. Dependencies rieng theo service

### 3.1 Order Service

Trong module order_service:

- spring-boot-starter-data-jpa
- spring-kafka
- spring-cloud-starter-circuitbreaker-resilience4j
- postgresql (runtime)
- mysql-connector-j (runtime)

Cau hinh rieng:

- spring.application.name=order-service
- Kafka topic thong bao: app.kafka.notification-topic=notificationTopic
- Resilience4j cho inventoryService:
      - circuit breaker
      - retry
      - timeout
- URL goi Inventory: inventory.service.base-url

### 3.2 Inventory Service

Trong module inventory_service:

- spring-boot-starter-data-jpa
- postgresql (runtime)
- mysql-connector-j (runtime)

Cau hinh rieng:

- spring.application.name=inventory-service

### 3.3 Product Service

Trong module product_service:

- spring-boot-starter-data-mongodb

Cau hinh rieng:

- spring.application.name=product-service
- spring.data.mongodb.uri

Luu y xung dot yeu cau SQL/Mongo:

- Tai lieu goc mo ta Product vua dung PostgreSQL vua dung MongoDB.
- Cau hinh hien tai da chon MongoDB lam mac dinh vi phu hop mo ta MongoRepository va docker compose co MongoDB.
- Neu nhom chot SQL, can doi dependency cua product_service sang JPA va cap nhat application.properties + compose.

## 4. Cau hinh chung ap dung dong bo toan repo

### 4.1 Eureka Discovery

Mac dinh tat ca service dang ky ve:

- http://localhost:8761/eureka

Trong code, gia tri nay duoc parameter hoa bang bien moi truong:

- EUREKA_SERVER_URL

### 4.2 Observability

Tat ca service deu bat:

- /actuator/health
- /actuator/prometheus

Cau hinh truy vet:

- management.tracing.sampling.probability=1.0
- management.zipkin.tracing.endpoint qua bien ZIPKIN_ENDPOINT

### 4.3 Docker va Docker Compose

Moi module co Dockerfile rieng:

- eureka_server/Dockerfile
- inventory_service/Dockerfile
- order_service/Dockerfile
- product_service/Dockerfile

File compose.yaml khoi tao:

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

### 4.4 Testing va coverage

Tat ca service co test class context load.

Yeu cau toi thieu 80% coverage cho Inventory va Order duoc cau hinh bang JaCoCo check tai:

- inventory_service/pom.xml
- order_service/pom.xml

Luu y:

- Neu code nghiep vu chua du, JaCoCo co the fail khi chay verify.
- Can bo sung unit test/integration test API de dat nguong 80% thuc te.

## 5. Cac file cau hinh chinh

### 5.1 Parent POM

File: pom.xml

Vai tro:

- Quan ly modules
- Quan ly dependency version (Spring Cloud BOM)
- Cung cap dependency chung cho cac child module
- Cung cap plugin management (Spring Boot plugin, JaCoCo)

### 5.2 Service properties

- inventory_service/src/main/resources/application.properties
- order_service/src/main/resources/application.properties
- product_service/src/main/resources/application.properties
- eureka_server/src/main/resources/application.properties

Tat ca da duoc chuan hoa theo ten service dang kebab-case va endpoint observability.

## 6. Cach chay du an

### Buoc 1: Build tat ca module

Tai thu muc goc Bai04_BuildMicoservices:

```bash
mvn clean package
```

### Buoc 2: Khoi dong he thong bang Docker Compose

```bash
docker compose up --build
```

### Buoc 3: Kiem tra nhanh

- Eureka Dashboard: http://localhost:8761
- Zipkin: http://localhost:9411
- Inventory health: http://localhost:8081/actuator/health
- Order health: http://localhost:8082/actuator/health
- Product health: http://localhost:8083/actuator/health
- Prometheus metrics:
      - http://localhost:8081/actuator/prometheus
      - http://localhost:8082/actuator/prometheus
      - http://localhost:8083/actuator/prometheus

## 7. Ghi chu van hanh

- Hien tai compose co ca MySQL va PostgreSQL de phuc vu yeu cau bai tap linh hoat.
- Inventory va Order dang cau hinh mac dinh tren PostgreSQL.
- Neu chuyen sang MySQL, cap nhat lai INVENTORY_DB_URL va ORDER_DB_URL trong compose hoac bien moi truong runtime.
- Tiep theo nen bo sung API thuc te va test Unit/Integration cho tung endpoint de dam bao dat KPI coverage 80% dung yeu cau de bai.