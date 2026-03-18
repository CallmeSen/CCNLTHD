# Test Scenarios - Order Service

## 1) Scope va muc tieu
Tai lieu nay mo ta cac kich ban test cho Order Service theo de bai trong `yeucau.md`, bao gom:
- Unit test
- Integration test
- Muc tieu bao phu yeu cau API dat don, xu ly ton kho, Resilience4j, Kafka, DB quan he, Eureka, Actuator/Prometheus va Docker.

## 2) Gia dinh va moi truong test
- Cong nghe test de xuat:
  - JUnit 5
  - Mockito
  - Spring Boot Test
  - MockMvc
  - Testcontainers (PostgreSQL/MySQL, Kafka)
  - WireMock hoac MockWebServer (gia lap Inventory Service)
  - Embedded Kafka (neu khong dung Testcontainers Kafka)
- Du lieu mau:
  - SKU hop le: `iphone_13`
  - SKU het hang: `iphone_13_out`
- Endpoint chinh:
  - `POST /api/order`
  - `GET /api/order/{id}`

## 3) Unit Test Scenarios

### 3.1 Service layer - OrderServiceImpl

| ID | Ten kich ban | Muc tieu | Dieu kien tien de | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|---|
| UT-SRV-01 | Dat don thanh cong khi tat ca item con hang | Xac minh luong happy path trong service | Mock inventoryServiceClient tra ve `true`; request hop le | Goi `placeOrder(request)` | `orderRepository.save()` duoc goi 1 lan; `orderEventProducer.sendOrderPlacedEvent()` duoc goi 1 lan; khong throw exception |
| UT-SRV-02 | Dat don that bai khi co item het hang | Dam bao khong tao don khi inventory = false | Mock inventory co it nhat 1 item tra `false` | Goi `placeOrder(request)` | Throw `OutOfStockException`; `orderRepository.save()` khong duoc goi; khong publish Kafka |
| UT-SRV-03 | Inventory service unavailable | Xac minh xu ly loi tu inventory | Mock `isInStock().join()` nem `CompletionException` co cause `InventoryServiceUnavailableException` | Goi `placeOrder(request)` | Exception `InventoryServiceUnavailableException` duoc nem ra; khong save don |
| UT-SRV-04 | Mapping request -> OrderLineItems | Kiem tra mapping field dung | Request gom 1 line item day du field | Goi `placeOrder(request)` va capture entity luu | `skuCode`, `price`, `quantity` trong entity trung request |
| UT-SRV-05 | Tao orderNumber khong rong | Dam bao sinh order number | Mock inventory true | Goi `placeOrder(request)` va capture Order | `orderNumber` khac null/khong rong |
| UT-SRV-06 | getOrderById thanh cong | Lay don theo id hop le | Mock repository tim thay order | Goi `getOrderById(id)` | Response dung `id`, `orderNumber`, va danh sach line items |
| UT-SRV-07 | getOrderById khong tim thay | Xac minh loi not found | Mock repository tra `Optional.empty()` | Goi `getOrderById(id)` | Throw `ResourceNotFoundException` voi message chua id |
| UT-SRV-08 | Nhieu line item deu con hang | Xac minh allMatch inventory | Mock inventory true cho moi item | Goi `placeOrder(request)` voi N item | Tat ca sku duoc check; don duoc luu thanh cong |

### 3.2 Controller layer - OrderController

| ID | Ten kich ban | Muc tieu | Dieu kien tien de | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|---|
| UT-CTL-01 | POST /api/order tra ve 201 | Xac minh status code va message | Mock `orderService.placeOrder()` khong throw | Goi API bang MockMvc voi body hop le | HTTP 201, body chua message `Order Placed` |
| UT-CTL-02 | GET /api/order/{id} tra ve 200 | Xac minh API get by id | Mock service tra `OrderResponse` | Goi GET voi id hop le | HTTP 200 va JSON dung schema |
| UT-CTL-03 | Validation loi khi danh sach item rong | Xac minh bean validation | Request co `orderLineItemsDtoList=[]` | Goi POST | HTTP 400; error code `VALIDATION_ERROR`; details co field loi |
| UT-CTL-04 | Validation loi khi skuCode rong | Xac minh validation line item | `skuCode=""` | Goi POST | HTTP 400; thong bao `skuCode is required` |
| UT-CTL-05 | Validation loi khi price <= 0 | Xac minh rang buoc gia | `price=0` | Goi POST | HTTP 400; thong bao `price must be greater than 0` |
| UT-CTL-06 | Validation loi khi quantity <= 0 | Xac minh rang buoc so luong | `quantity=0` | Goi POST | HTTP 400; thong bao `quantity must be greater than 0` |

### 3.3 Exception handler - GlobalExceptionHandler

| ID | Ten kich ban | Muc tieu | Dieu kien tien de | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|---|
| UT-EX-01 | Xu ly ResourceNotFoundException | Dam bao ma loi dung | Nem exception tu controller/service | Kich hoat handler | HTTP 404, code `RESOURCE_NOT_FOUND` |
| UT-EX-02 | Xu ly OutOfStockException | Dam bao conflict response | Nem `OutOfStockException` | Kich hoat handler | HTTP 409, code `OUT_OF_STOCK` |
| UT-EX-03 | Xu ly InventoryServiceUnavailableException | Dam bao service unavailable | Nem `InventoryServiceUnavailableException` | Kich hoat handler | HTTP 503, code `INVENTORY_UNAVAILABLE` |
| UT-EX-04 | Xu ly MethodArgumentNotValidException | Dam bao format validation errors | Tao request invalid | Kich hoat handler | HTTP 400, code `VALIDATION_ERROR`, details map day du |

### 3.4 Integration client layer - InventoryServiceClient (unit style voi mock RestClient)

| ID | Ten kich ban | Muc tieu | Dieu kien tien de | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|---|
| UT-INV-01 | parse body Boolean true | Xu ly response dang boolean | RestClient tra `true` | Goi `isInStock(...).join()` | Ket qua `true` |
| UT-INV-02 | parse body map co quantity du | Xu ly map `{quantity: x}` | quantity >= requestedQuantity | Goi `isInStock` | Ket qua `true` |
| UT-INV-03 | parse body map inStock=false | Uu tien trang thai het hang | map co `inStock=false` | Goi `isInStock` | Ket qua `false` |
| UT-INV-04 | parse body null | Defend null response | RestClient tra null | Goi `isInStock` | Ket qua `false` |
| UT-INV-05 | fallback khi call inventory loi | Kich hoat fallback resilience | Gia lap RestClient throw exception | Goi `isInStock().join()` | Throw `InventoryServiceUnavailableException` |

## 4) Integration Test Scenarios

### 4.1 API + DB + Inventory + Kafka end-to-end

| ID | Ten kich ban | Muc tieu | Moi truong | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|---|
| IT-E2E-01 | Dat don thanh cong (full flow) | Test luong thanh cong tu API den DB va Kafka | SpringBootTest + Testcontainers DB + Kafka + mock Inventory (WireMock) | POST `/api/order` voi body hop le; inventory tra con hang | HTTP 201; ban ghi order va order_line_items duoc tao; topic `notificationTopic` nhan message |
| IT-E2E-02 | Dat don that bai khi het hang | Dam bao rollback logic nghiep vu | Nhu tren, inventory tra `false` | POST order | HTTP 409; DB khong co order moi; Kafka khong co message |
| IT-E2E-03 | Inventory service timeout -> fallback | Kiem tra timeout + fallback + map loi API | WireMock delay qua nguong timeout resilience | POST order | HTTP 503; DB khong luu don; response code `INVENTORY_UNAVAILABLE` |
| IT-E2E-04 | Inventory service loi 5xx + retry | Kiem tra retry cua resilience | WireMock: 2 lan dau 500, lan sau 200 | POST order | API cuoi cung 201 (neu retry thanh cong); so lan goi inventory dung theo cau hinh retry |
| IT-E2E-05 | Inventory service down hoan toan | Dam bao he thong van on dinh | Inventory khong reachable | POST order | HTTP 503 on dinh, khong crash service, khong luu DB |

### 4.2 API validation + exception mapping (integration)

| ID | Ten kich ban | Muc tieu | Moi truong | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|---|
| IT-API-01 | Payload thieu orderLineItemsDtoList | Validation request body | SpringBootTest + MockMvc | POST voi body thieu field | HTTP 400, body co `VALIDATION_ERROR` |
| IT-API-02 | skuCode blank | Validation item field | Nhu tren | POST voi `skuCode=""` | HTTP 400 |
| IT-API-03 | price am | Validation item field | Nhu tren | POST voi `price=-1` | HTTP 400 |
| IT-API-04 | quantity am/0 | Validation item field | Nhu tren | POST voi quantity <= 0 | HTTP 400 |
| IT-API-05 | GET order theo id ton tai | Doc DB + mapping response | Tao san order trong DB | GET `/api/order/{id}` | HTTP 200, du lieu chinh xac |
| IT-API-06 | GET order theo id khong ton tai | Exception handler 404 | DB khong co id | GET `/api/order/{id}` | HTTP 404, code `RESOURCE_NOT_FOUND` |

### 4.3 Observability va discovery

| ID | Ten kich ban | Muc tieu | Moi truong | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|---|
| IT-OBS-01 | Health endpoint hoat dong | Xac minh Actuator health | Chay service voi actuator expose | GET `/actuator/health` | HTTP 200, status `UP` |
| IT-OBS-02 | Prometheus endpoint hoat dong | Xac minh metrics expose | Nhu tren | GET `/actuator/prometheus` | HTTP 200, response co metric text |
| IT-OBS-03 | Dang ky Eureka thanh cong | Service discovery san sang | Docker compose co eureka-server | Khoi dong order-service | Eureka dashboard hien `ORDER-SERVICE` |

### 4.4 Docker/compose smoke test

| ID | Ten kich ban | Muc tieu | Moi truong | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|---|
| IT-DKR-01 | Build image thanh cong | Xac minh Dockerfile dung | Docker local | Build image order-service | Build thanh cong, khong loi runtime dependency |
| IT-DKR-02 | Compose startup thanh cong | Xac minh kha nang van hanh cung DB/Kafka/Eureka | docker compose | Start toan bo stack | Cac container `healthy`/`running`; order-service ket noi duoc cac phu thuoc |
| IT-DKR-03 | Dat don qua compose stack | Smoke test runtime | Stack da chay | Goi POST order | Nhan 201 va thong bao order placed |

## 5) Uu tien thuc thi de dat coverage >= 80%
1. Bat buoc truoc: `UT-SRV-01..08`, `UT-CTL-01..06`, `UT-EX-01..04`.
2. Sau do bo sung: `UT-INV-01..05` de tang cover edge case.
3. Integration cot loi: `IT-E2E-01`, `IT-E2E-02`, `IT-E2E-03`, `IT-API-05`, `IT-API-06`.
4. Smoke/ops: `IT-OBS-01`, `IT-OBS-02`, `IT-DKR-01`.

## 6) Tieu chi pass/fail
- Tat ca test trong nhom Mandatory pass.
- Khong co regression o API dat don.
- JaCoCo line coverage >= 80% theo rule trong `pom.xml`.
- Khong phat sinh loi runtime khi chay cung Docker Compose.

## 7) Ghi chu cho QA va dev
- Trong code hien tai co `GET /api/order/{id}` (ngoai de bai goc), nen nen co test bo sung cho endpoint nay.
- Nen tach test thanh 2 profile:
  - `unit`: chay nhanh, mock phu thuoc ngoai.
  - `integration`: dung Testcontainers/WireMock/EmbeddedKafka.
- Nen dat convention ten test theo mau: `should_<expected>_when_<condition>` de de review.
