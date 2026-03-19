Đề bài: Xây dựng Notification Service trong hệ thống Microservices 
Mục tiêu 
• Hiểu cơ chế Event-Driven Microservices. 
• Sử dụng Kafka để gửi và nhận thông báo giữa các service. 
• Xây dựng service xử lý thông báo khi đơn hàng được tạo thành công. 
• Tích hợp Actuator, Prometheus và Zipkin để giám sát hệ thống. 
Yêu cầu chi tiết 1. Tạo ứng dụng Spring Boot 
Dependency: 
• Spring Web 
• Spring Kafka 
• Spring Cloud Eureka Client 
• Spring Boot Actuator 
• Micrometer Tracing (Zipkin) 
• Micrometer Registry Prometheus 
• Lombok 
2. Nhận sự kiện từ Kafka 
Notification Service phải subscribe topic: 
notificationTopic 
Khi order-service tạo đơn hàng thành công, service này sẽ gửi message đến topic trên. Ví dụ message: 
{  "orderNumber": "ORD123",  "message": "Order Placed Successfully" } 
3. Xử lý thông báo 
Khi nhận message: 
• ghi log thông báo 
• lưu vào database (tùy chọn) 
• giả lập gửi email xác nhận đơn hàng 
4. Tích hợp Eureka Discovery Server 
Cấu hình 
spring.application.name=notification-service eureka.client.serviceUrl.defaultZone=http://localhost:8761/eureka 
5. Tích hợp Actuator và Prometheus 
Expose endpoint Health check 
/actuator/health 
Metrics 
/actuator/prometheus 
6. Viết test 
Viết test cho: 
• Kafka consumer nhận message thành công 
• xử lý message đúng 
7. Triển khai với Docker 
• Tạo Dockerfile 
• Chạy cùng Kafka, Eureka và các service khác bằng Docker Compose 
Gợi ý Công nghệ 
• Spring Boot 
• Spring Kafka 
• Eureka Client 
• Actuator 
• Prometheus 
• Zipkin 
• Docker 
Tài liệu tham khảo 
Spring Kafka 
https://spring.io/guides/gs/messaging-kafka/ 
Cấu trúc dự án tham khảo 
notification-service/ 
├── src/ 
│ ├── main/ 
│ │ ├── java/ 
│ │ │ ├── com.hdbank.notificationservice/ 
│ │ │ │ ├── controller/ 
│ │ │ │ ├── listener/ 
│ │ │ │ ├── service/ 
│ │ │ │ ├── dto/ 
│ │ │ │ └── NotificationServiceApplication.java 
│ │ └── resources/ 
│ │ ├── application.properties 
│ │ └── banner.txt 
│ └── test/ 
│ └── java/ 
│ └── com.hdbank.notificationservice/ 
│ └── NotificationServiceApplicationTests.java 
└── pom.xml 
Phần mở rộng (nếu có thời gian) 
• Thêm Retry khi xử lý message thất bại. 
• Thêm Dead Letter Topic. 
• Thêm Email notification thực tế. 
• Triển khai hệ thống lên Kubernetes. 