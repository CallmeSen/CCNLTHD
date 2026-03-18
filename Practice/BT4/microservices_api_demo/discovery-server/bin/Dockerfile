# Use an official OpenJDK runtime as a parent image
FROM openjdk:21-jdk-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the jar file from the target folder to the container
COPY target/discovery-server-0.0.1-SNAPSHOT.jar /app/discovery-server.jar

# Copy application-docker.properties
COPY src/main/resources/application-docker.properties /app/config/application-docker.properties

# Cấu hình Java để sử dụng application-docker.properties
ENV SPRING_CONFIG_LOCATION=file:/app/config/application-docker.properties

# Expose the port the app runs on
EXPOSE 8761

# Chạy ứng dụng
ENTRYPOINT ["java", "-jar", "/app/discovery-server.jar"]
