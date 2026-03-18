Đề bài: Xây dựng Product Service trong hệ thống Microservices Mục tiêu: 
• Hiểu và áp dụng kiến thức về Spring Boot để xây dựng một microservice. 
• Sử dụng PostgreSQL làm cơ sở dữ liệu để lưu trữ thông tin sản phẩm. 
• Triển khai các REST API cơ bản để quản lý sản phẩm. 
 
Yêu cầu chi tiết: 1. Tạo ứng dụng Spring Boot 
• Sử dụng Spring Initializr hoặc khởi tạo từ Intellij IDE để khởi tạo dự án với các 
dependency: 
o Spring Web 
o Spring Data  
o Lombok 
2. Xây dựng các REST API 
• Tạo sản phẩm mới: 
o API: POST /api/product 
o Request body: 
{   "name": "iPhone 13",   "description": "iPhone 13",   "price": 1200 } 
o Response: HTTP Status 201 (Created). 
• Lấy danh sách tất cả sản phẩm: 
o API: GET /api/product 
o Response: 
[   {     "id": "12345",     "name": "iPhone 13",     "description": "iPhone 13",     "price": 1200   } ] 
3. Sử dụng PostgreSQL làm cơ sở dữ liệu 
• Tạo model Product với các trường: 
o id (String) 
o name (String) 
o description (String) 
o price (BigDecimal) 
• Sử dụng Spring Data MongoDB để thao tác với cơ sở dữ liệu. 
• Tạo repository interface ProductRepository kế thừa từ MongoRepository. 
4. Tích hợp Actuator và Prometheus 
• Cấu hình Actuator để expose các endpoint: 
o Health check: /actuator/health 
o Metrics: /actuator/prometheus 
• Sử dụng Micrometer để tích hợp với Prometheus và Zipkin. 
5. Triển khai ứng dụng với Docker 
• Tạo Dockerfile để đóng gói ứng dụng. 
• Sử dụng Docker Compose để chạy ứng dụng cùng với MongoDB và Eureka 
Server. 
 
Gợi ý: 
1. Công cụ và công nghệ sử dụng: 
o Spring Boot 
o Spring Data  
o Lombok 
o Docker 2. Tài liệu tham khảo: 
o Tài liệu chính thức của Spring Boot: https://spring.io/projects/spring-boot 
o Hướng dẫn sử dụng Spring Data  
o Hướng dẫn sử dụng Testcontainers: https://www.testcontainers.org/ 3. Cấu trúc dự án tham khảo: 
product-service/ 
├── src/ 
│   ├── main/ 
│   │   ├── java/ 
│   │   │   ├── com.hdbank.productservice/ 
│   │   │   │   ├── controller/ 
│   │   │   │   ├── model/ 
│   │   │   │   ├── repository/ 
│   │   │   │   ├── service/ 
│   │   │   │   ├── dto/ 
│   │   │   │   ├── util/ 
│   │   │   │   └── ProductServiceApplication.java 
│   │   └── resources/ 
│   │       ├── application.properties 
│   │       └── banner.txt 
│   └── test/ 
│       └── java/ 
│           └── com.hdbank.productservice/ 
│               └── ProductServiceApplicationTests.java 
└── pom.xml 
 
Phần mở rộng (nếu có thời gian): 
• Thêm tính năng Circuit Breaker (sử dụng Resilience4j) để xử lý lỗi khi giao tiếp 
với các service khác. 
• Triển khai ứng dụng lên Kubernetes. 
• Thêm tính năng Logging và Tracing sử dụng ELK Stack hoặc Jaeger.