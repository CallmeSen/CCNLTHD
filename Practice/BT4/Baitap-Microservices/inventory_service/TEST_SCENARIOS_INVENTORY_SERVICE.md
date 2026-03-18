# Kich Ban Test - Inventory Service

## 1. Muc tieu tai lieu
Tai lieu nay mo ta cac kich ban test cho Inventory Service theo yeu cau trong file yeucau.md, gom:
- Unit test cho cac lop Controller, Service, Repository, DTO/Mapper (neu co).
- Integration test cho API, database, Eureka, Actuator, Prometheus va Docker environment.

## 2. Pham vi test
- API chinh: `GET /api/inventory`
- Query param: `skuCode` (danh sach ma san pham)
- Dinh dang response mong doi:
```json
[
  {
    "skuCode": "iphone_13",
    "isInStock": true
  },
  {
    "skuCode": "iphone_13_red",
    "isInStock": false
  }
]
```
- He thong lien quan:
  - CSDL quan he (MySQL/PostgreSQL)
  - Eureka Discovery Server
  - Actuator (`/actuator/health`)
  - Prometheus metrics (`/actuator/prometheus`)

## 3. Gia dinh va quy uoc
- `isInStock = true` khi `quantity > 0`.
- `isInStock = false` khi `quantity <= 0` hoac khong tim thay `skuCode`.
- API tra ve HTTP 200 cho request hop le, ke ca khi mot so `skuCode` khong ton tai.
- API validation:
  - Thieu query param `skuCode` => HTTP 400.
  - `skuCode` rong/chi chua khoang trang => HTTP 400.

## 4. Du lieu test mau
- SKU ton tai, con hang: `iphone_13`, `samsung_s23`
- SKU ton tai, het hang: `iphone_13_red` (quantity = 0)
- SKU khong ton tai: `nokia_3310`

## 5. Danh sach Unit Test Scenarios

| ID | Layer | Ten kich ban | Du lieu vao | Buoc chinh | Ket qua mong doi | Uu tien |
|---|---|---|---|---|---|---|
| UT-01 | Service | Kiem tra 1 SKU con hang | `skuCode=iphone_13` | Mock repository tra ve `quantity=10`, goi ham service | `skuCode=iphone_13`, `isInStock=true` | High |
| UT-02 | Service | Kiem tra 1 SKU het hang | `skuCode=iphone_13_red` | Mock repository tra ve `quantity=0`, goi ham service | `isInStock=false` | High |
| UT-03 | Service | Kiem tra SKU khong ton tai | `skuCode=nokia_3310` | Mock repository khong tim thay ban ghi | `isInStock=false` | High |
| UT-04 | Service | Kiem tra nhieu SKU tron trang thai | `iphone_13, iphone_13_red, nokia_3310` | Mock repository tra ve du lieu mot phan | Tra ve dung so phan tu va dung tung `isInStock` | High |
| UT-05 | Service | Dam bao thu tu ket qua theo input | `skuCode` theo thu tu tuy y | Goi service voi list SKU co thu tu xac dinh | Response giu thu tu theo danh sach input | Medium |
| UT-06 | Service | Validation: list SKU rong | `[]` | Goi service voi list rong | Nem exception hop le hoac tra ket qua validation fail | High |
| UT-07 | Service | Validation: SKU null | `null` trong list | Goi service | Nem exception validation | High |
| UT-08 | Service | Validation: SKU chi khoang trang | `"   "` | Goi service | Nem exception validation | High |
| UT-09 | Controller | Parse query param da gia tri | `?skuCode=iphone_13&skuCode=samsung_s23` | Mock service, goi endpoint bang MockMvc | HTTP 200, body la JSON array dung format | High |
| UT-10 | Controller | Thieu query param `skuCode` | Khong truyen `skuCode` | Goi endpoint | HTTP 400 + thong diep loi validation | High |
| UT-11 | Controller | SKU rong | `?skuCode=` | Goi endpoint | HTTP 400 | High |
| UT-12 | Controller | Tra loi content-type | Request hop le | Goi endpoint | `Content-Type: application/json` | Medium |
| UT-13 | Repository | Truy van theo nhieu SKU | Danh sach SKU mau | Dung @DataJpaTest, save test data, query | So ban ghi tra ve dung va khop SKU | High |
| UT-14 | Repository | SKU khong ton tai trong DB | `nokia_3310` | Query repository | Tra ve empty list | High |
| UT-15 | Mapper/DTO | Mapping entity -> DTO dung gia tri | 1 entity Inventory | Goi mapper/constructor DTO | `skuCode` va `isInStock` chinh xac | Medium |

## 6. Danh sach Integration Test Scenarios

| ID | Nhom | Ten kich ban | Tien dieu kien | Buoc chinh | Ket qua mong doi | Uu tien |
|---|---|---|---|---|---|---|
| IT-01 | API + DB | Kiem tra ton kho thanh cong | DB co `iphone_13` quantity > 0 | Goi `GET /api/inventory?skuCode=iphone_13` | HTTP 200, `isInStock=true` | High |
| IT-02 | API + DB | Kiem tra san pham het hang | DB co `iphone_13_red` quantity = 0 | Goi API | HTTP 200, `isInStock=false` | High |
| IT-03 | API + DB | SKU khong ton tai | DB khong co `nokia_3310` | Goi API | HTTP 200, tra ve SKU voi `isInStock=false` | High |
| IT-04 | API + DB | Nhieu SKU cung luc | DB seed nhieu SKU | Goi API voi nhieu `skuCode` | Danh sach response day du, dung tung SKU | High |
| IT-05 | Validation | Thieu query param | App dang chay | Goi `GET /api/inventory` | HTTP 400 | High |
| IT-06 | Validation | SKU rong/khong hop le | App dang chay | Goi API voi `skuCode=` hoac khoang trang | HTTP 400 | High |
| IT-07 | Error handling | Loi ket noi DB | DB dung hoac config sai | Goi API | HTTP 5xx + log loi ro rang | Medium |
| IT-08 | Actuator | Health endpoint san sang | App dang chay | Goi `GET /actuator/health` | HTTP 200, status `UP` | High |
| IT-09 | Metrics | Prometheus endpoint | App dang chay va expose endpoint | Goi `GET /actuator/prometheus` | HTTP 200, co metric text format | High |
| IT-10 | Eureka | Dang ky service thanh cong | Eureka server dang chay | Khoi dong inventory-service, kiem tra dashboard/registry | Service xuat hien voi ten `inventory-service` | High |
| IT-11 | Docker Compose | Khoi dong cung DB + Eureka | Co Dockerfile va compose | `docker compose up`, goi API | App khoi dong duoc, API tra ket qua dung | High |
| IT-12 | Contract | Kiem tra format response | App + DB co du lieu | Goi API va validate schema JSON | Moi phan tu co `skuCode` (string), `isInStock` (boolean) | High |
| IT-13 | Performance co ban | Load nhe endpoint inventory | Seed du lieu vua du | Goi 100-500 request lien tiep | Ti le loi ~0%, response time dat nguong noi bo | Medium |
| IT-14 | Tracing | Xac nhan tao trace Zipkin | Zipkin dang chay, app da config tracing | Goi API, kiem tra trace trong Zipkin | Co span cho request inventory | Medium |
| IT-15 | Security baseline (neu chua bat auth) | Endpoint cong khai dung nhu thiet ke | Chua bat security | Goi API khong token | API truy cap duoc, dung behavior hien tai | Low |

## 7. Goi y trien khai test tu dong
- Unit test framework:
  - JUnit 5
  - Mockito
  - Spring Boot Test (`@WebMvcTest`, `@DataJpaTest`)
- Integration test framework:
  - `@SpringBootTest(webEnvironment = RANDOM_PORT)`
  - Testcontainers cho MySQL/PostgreSQL, co the them cho Zipkin neu can
  - MockMvc hoac RestAssured de goi API

## 8. Tieu chi pass/fail
- Tat ca test `High` phai pass.
- Ti le test pass >= 95% cho toan bo suite.
- Code coverage:
  - Unit test + integration test dat >= 80% (theo yeu cau bai).

## 9. Checklist run truoc khi day len GitHub
- Da tao data seed test cho cac case con hang/het hang/khong ton tai.
- Da cau hinh profile test rieng (`application-test.properties`).
- Da run unit test va integration test thanh cong.
- Da cap nhat README neu bo sung cach chay test.

## 10. Lenh Git de dua file .md len GitHub
```bash
git add TEST_SCENARIOS_INVENTORY_SERVICE.md
git commit -m "docs: add unit and integration test scenarios for inventory service"
git push origin inventory_service
```
