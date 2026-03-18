# Order Service - Run & Test Commands

## 1) Prerequisites
- JDK 21
- Maven 3.9+
- MySQL (XAMPP) for runtime run
- (Optional) Eureka server at `http://localhost:8761`
- (Optional) Kafka at `localhost:9092`

## 2) Go to project root
From monorepo root (`Bai04_BuildMicoservices`):

```powershell
cd ..\CCNLTHD\Practice\BT4\Bai04_BuildMicoservices
```

## 3) Run tests (order_service)
```powershell
mvn -pl order_service test
```

## 4) Package service
```powershell
mvn -pl order_service clean package
```

## 5) Run service (foreground)
```powershell
mvn -pl order_service spring-boot:run
```

## 6) Run service (background/forked) + stop
Start:
```powershell
mvn -pl order_service spring-boot:start
```

Stop:
```powershell
mvn -pl order_service spring-boot:stop
```

## 7) Health check
```powershell
curl.exe -s -o NUL -w "%{http_code}" http://localhost:8082/actuator/health
```

Expected result: `200`

## 8) Start + health + stop in one command
```powershell
mvn -pl order_service spring-boot:start; Start-Sleep -Seconds 10; curl.exe -s -o NUL -w "%{http_code}" http://localhost:8082/actuator/health; Write-Host ""; mvn -pl order_service spring-boot:stop
```

## 9) Run from inside order_service folder
If you are already in `order_service`, remove `-pl order_service`:

```powershell
cd D:\CCNLTHD\Practice\BT4\Bai04_BuildMicoservices\order_service
mvn test
mvn spring-boot:run
mvn spring-boot:start
mvn spring-boot:stop
```

## 10) Common notes
- If Eureka is not running, service can still start but logs warning about registration.
- If Kafka is not running, app/test may still start depending on config, but producer send calls will fail at runtime.
- Runtime DB is configured by `src/main/resources/application.properties`.
- Test DB is configured by `src/test/resources/application.properties` (H2).
