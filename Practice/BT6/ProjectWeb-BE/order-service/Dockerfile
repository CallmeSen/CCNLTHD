# Chọn image base (sử dụng JDK image)
FROM openjdk:21-jdk-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Sao chép file jar vào container
COPY target/order-service-0.0.1-SNAPSHOT.jar /app/order-service.jar

# Chạy ứng dụng khi container bắt đầu
ENTRYPOINT ["java", "-jar", "/app/order-service.jar"]

# Cấu hình cổng mà ứng dụng sẽ lắng nghe
EXPOSE 8083