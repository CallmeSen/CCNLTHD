# Test Scenarios - Product Service

## 1. Muc tieu
Tai lieu nay mo ta cac kich ban test cho Product Service, gom:
- Unit test: test tung don vi logic (service, controller, mapper).
- Integration test: test end-to-end trong pham vi service (API -> service -> MongoDB).

Pham vi theo yeu cau trong de bai:
- POST /api/product
- GET /api/product
- Actuator health: /actuator/health
- Actuator metrics: /actuator/prometheus

## 2. Tong quan he thong test
- Service dang dung Spring Boot + Spring Data MongoDB.
- Product gom cac truong: id, name, description, price.
- Chua thay annotation validation tren request DTO (vi du @NotBlank, @Positive).
- Can bo sung testcase negative de phat hien loi nghiep vu/constrain bi thieu.

## 3. Kich ban Unit Test

### 3.1 Unit test cho ProductService

| ID | Ten kich ban | Muc tieu | Du lieu vao | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|---|
| UT-SVC-01 | Tao san pham thanh cong | Dam bao createProduct luu du lieu dung | ProductRequest hop le | Mock ProductRepository.save, goi createProduct | save duoc goi 1 lan voi Product co name/description/price dung |
| UT-SVC-02 | Tao san pham voi name null | Phat hien thieu validate dau vao | name = null | Goi createProduct | Hien tai: van save (bug/risk). Mong doi nghiep vu: tu choi du lieu khong hop le |
| UT-SVC-03 | Tao san pham voi price am | Phat hien thieu rule gia tri | price < 0 | Goi createProduct | Hien tai: van save (bug/risk). Mong doi nghiep vu: khong cho luu |
| UT-SVC-04 | Tao san pham voi request null | Xac dinh behavior khi input null | request = null | Goi createProduct | Nem NullPointerException (hoac custom exception neu bo sung validate) |
| UT-SVC-05 | Lay danh sach san pham rong | Dam bao getAllProducts xu ly empty list | findAll tra [] | Goi getAllProducts | Tra ve [] |
| UT-SVC-06 | Lay danh sach nhieu san pham | Dam bao mapping Product -> ProductResponse dung | findAll tra 2 Product | Goi getAllProducts | Tra ve 2 ProductResponse, tat ca field map dung |
| UT-SVC-07 | Mapping giu nguyen do chinh xac BigDecimal | Tranh sai so khi map price | price = 1200.50 | Goi getAllProducts | ProductResponse.price = 1200.50 |
| UT-SVC-08 | Loi tu repository khi save | Dam bao loi duoc day len dung | save nem RuntimeException | Goi createProduct | Exception duoc throw len caller |
| UT-SVC-09 | Loi tu repository khi findAll | Dam bao loi duoc day len dung | findAll nem RuntimeException | Goi getAllProducts | Exception duoc throw len caller |

### 3.2 Unit test cho ProductController

| ID | Ten kich ban | Muc tieu | Du lieu vao | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|---|
| UT-CTL-01 | POST /api/product goi dung service | Dam bao controller delegate dung | JSON hop le | MockMvc goi POST | HTTP 201, ProductService.createProduct duoc goi 1 lan |
| UT-CTL-02 | GET /api/product tra danh sach | Dam bao endpoint doc du lieu dung | Service tra 2 item | MockMvc goi GET | HTTP 200, body la JSON array 2 item |
| UT-CTL-03 | GET /api/product khi danh sach rong | Dam bao response format nhat quan | Service tra [] | MockMvc goi GET | HTTP 200, body [] |
| UT-CTL-04 | POST body khong hop le JSON | Dam bao API xu ly malformed JSON | body sai dinh dang | MockMvc goi POST | HTTP 400 |
| UT-CTL-05 | Service nem exception o POST | Kiem tra xu ly loi chua co handler | Service nem RuntimeException | MockMvc goi POST | Mac dinh HTTP 5xx (can bo sung @ControllerAdvice de chuan hoa loi) |

### 3.3 Unit test cho model/dto (khuyen nghi)

| ID | Ten kich ban | Muc tieu | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|
| UT-MDL-01 | Lombok builder tao object dung | Xac nhan builder/setter/getter hoat dong | Tao Product bang builder | Cac field dung theo gia tri gan |
| UT-DTO-01 | ProductRequest serialize/deserialize | Dam bao tuong thich JSON | Dung ObjectMapper convert qua lai | Gia tri truong duoc giu nguyen |

## 4. Kich ban Integration Test

### 4.1 Integration test API + MongoDB (khuyen nghi dung Testcontainers)

| ID | Ten kich ban | Muc tieu | Tien dieu kien | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|---|
| IT-API-01 | POST tao san pham thanh cong | Xac nhan luong API -> DB | MongoDB test container dang chay | POST /api/product voi body hop le | HTTP 201; DB co 1 document dung du lieu |
| IT-API-02 | GET lay danh sach sau khi tao | Xac nhan du lieu doc duoc tu DB | Da co san pham trong DB | GET /api/product | HTTP 200; tra ve array co item vua tao |
| IT-API-03 | GET khi DB rong | Dam bao behavior khi chua co du lieu | DB khong co product | GET /api/product | HTTP 200; body [] |
| IT-API-04 | Tao nhieu san pham lien tiep | Kiem tra tinh on dinh voi nhieu request | DB rong | Goi POST 3 lan, sau do GET | GET tra 3 item |
| IT-API-05 | POST voi price am | Xac nhan rule nghiep vu duoc enforce | DB rong | POST voi price = -1 | Mong doi nghiep vu: HTTP 400; hien tai co the 201 (ghi nhan gap) |
| IT-API-06 | POST voi name rong | Xac nhan rule du lieu bat buoc | DB rong | POST voi name = "" | Mong doi nghiep vu: HTTP 400; hien tai co the 201 (ghi nhan gap) |
| IT-API-07 | POST body thieu field | Kiem tra handling request khong day du | DB rong | POST khong co price | Hien tai: co the 201 (neu cho phep null). Mong doi nghiep vu: HTTP 400 |
| IT-API-08 | Content-Type khong dung | Dam bao API reject media type sai | DB rong | POST text/plain | HTTP 415 (neu cau hinh mac dinh) hoac 4xx phu hop |
| IT-API-09 | Kiem tra id duoc sinh tu Mongo | Xac nhan persist metadata | DB rong | POST hop le -> doc tu DB | Document co id khong rong |
| IT-API-10 | Khong mat do chinh xac gia | Dam bao decimal khong bi sai | price co phan thap phan | POST va GET lai | price giu nguyen gia tri so hoc |

### 4.2 Integration test cho Actuator va observability

| ID | Ten kich ban | Muc tieu | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|
| IT-ACT-01 | Health endpoint kha dung | Xac nhan service song | GET /actuator/health | HTTP 200, status = UP |
| IT-ACT-02 | Prometheus endpoint kha dung | Xac nhan export metric | GET /actuator/prometheus | HTTP 200, response co metric text format |
| IT-ACT-03 | Metrics sau khi goi API | Xac nhan metric request duoc ghi nhan | Goi POST/GET mot vai lan, sau do GET /actuator/prometheus | Co metric http server request tuong ung |

### 4.3 Integration test voi Docker Compose (smoke)

| ID | Ten kich ban | Muc tieu | Buoc test chinh | Ket qua mong doi |
|---|---|---|---|---|
| IT-ENV-01 | Service start cung MongoDB + Eureka | Xac nhan moi truong local dung | docker compose up | Tat ca container healthy, product-service chay binh thuong |
| IT-ENV-02 | API hoat dong trong moi truong compose | Smoke test sau khi deploy compose | Goi POST/GET tu host | API tra ve dung status nhu yeu cau |
| IT-ENV-03 | Restart product-service khong mat du lieu | Kiem tra tinh ben vung data | Tao du lieu, restart service, goi GET | Du lieu van con neu volume DB duoc cau hinh dung |

## 5. De xuat bo test code tuong ung

- Unit test framework:
  - JUnit 5
  - Mockito
  - Spring Boot Test + MockMvc (cho controller layer)
- Integration test framework:
  - @SpringBootTest(webEnvironment = RANDOM_PORT) hoac @AutoConfigureMockMvc
  - Testcontainers MongoDB
  - AssertJ + JSONPath

Cau truc class test de xuat:
- ProductServiceTest (unit)
- ProductControllerTest (web mvc slice)
- ProductIntegrationTest (api + mongodb)
- ActuatorIntegrationTest

## 6. Tieu chi pass/fail

- Pass:
  - Toan bo testcase critical (POST/GET co ban, health, prometheus) dat.
  - Khong co loi 5xx trong luong chuan.
- Fail:
  - API khong dung status code theo de bai.
  - Mapping sai du lieu (name/description/price/id).
  - Endpoint actuator khong truy cap duoc.

## 7. Ghi chu QA quan trong

- Tai lieu yeu cau co mau thuan nho: muc tieu ghi PostgreSQL, nhung phan ky thuat va code hien tai dang dung MongoDB.
- Cac testcase negative cho validate (name, price) rat quan trong vi code hien tai chua enforce rule input.
- Neu team bo sung validation, can cap nhat mong doi cua IT-API-05/06/07 thanh HTTP 400 ro rang.
