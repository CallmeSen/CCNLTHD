
# Order Processing System



## Technologies Used

Spring Boot: Backend framework for building microservices.

PostgreSQL: Database for persisting orders, products, and inventory.

Kafka: Message broker for asynchronous communication.

Redis: Caching layer to improve performance.

Spring Security & OAuth2: Authentication and authorization.

Spring Cloud Gateway: API gateway with security and routing.

Eureka Server: Service discovery.

Prometheus & Zipkin: Monitoring and distributed tracing.

Docker: Containerization for deployment.


## Overview

Order Processing System is a microservices-based application designed to handle order management efficiently. It utilizes modern programming technologies such as Spring Boot, Kafka, Redis, OAuth2, and Eureka for service discovery.

## Technologies Used
Spring Boot: Backend framework for building microservices.

PostgreSQL: Database for persisting orders, products, and inventory.

Kafka: Message broker for asynchronous communication.

Redis: Caching layer to improve performance.

Spring Security & OAuth2: Authentication and authorization.

Spring Cloud Gateway: API gateway with security and routing.

Eureka Server: Service discovery.

Prometheus & Zipkin: Monitoring and distributed tracing.

Docker: Containerization for deployment.
## Acknowledgements

 - [Spring ](https://spring.io/)
 - [Redis](https://redis.io/)
 - [Kafka](https://kafka.apache.org/documentation/)
 - [Docker](https://docs.docker.com/)

## System Architecture
#### The system consists of the following microservices:

- Order Service: Manages order creation and status.

- Inventory Service: Handles stock management.

- Product Service: Stores product details.

- Notification Service: Sends order-related notifications.

- API Gateway: Routes requests and enforces security.

- Discovery Server: Manages service discovery.
## Installation & Setup
#### Prerequisites
Docker & Docker Compose

Java 17+

Node.js (for frontend, if applicable)

PostgreSQL & Redis

Kafka & Zookeeper

| Step | Command |
|------|---------|
| 🛠 Clone the repository and navigate to the project |  git clone https://github.comTaun0813ProjectAPI <br> cd ProjectAPI <br>  |
| 🚀 Start required services |  docker-compose up -d  |
| ▶️ Run each microservice |  cd order-service <br>  mvn spring-boot:run <br>  |

## API Reference

### Product Service
#### Add product

 ```http
  POST /v1/api/product
```

#### Request Body:
    {
        "name": "iPhone 13",
        "description": "iPhone 13",
        "price": 1200
    }

#### Response: 
    HTTP Status 201 (Created)

#### Get all Products

```http
  GET /v1/api/product
```
#### Response:
    [
        {
            "id": "12345",
            "name": "iPhone 13",
            "description": "iPhone 13",
            "price": 1200
        }
    ]

### Inventory Service
#### Check stock
```http
  GET /v1/api/inventory?skuCode={}
```
    Query parameters: skuCode.

### Response
    [
        {
            "skuCode": "iphone_13",
            "quantity": 100,
            "isInStock": true
        }
    ]

### Order Service
#### Place Order

```http
  POST /v1/api/order
```

#### Request Body:
    {
        "skuCode": "iphone_13",
        "price": 1200,
        "quantity": 1
    }




## Security

Uses OAuth2 with JWT for authentication.

API Gateway allows /eureka/** without authentication.

All other requests require a valid OAuth2 token.


## Monitoring & Tracing

Prometheus for metrics.

Zipkin for distributed tracing.

## Contribution

    1. Fork the repository.

    2. Create a feature branch.

    3. Submit a pull request.

## License

[MIT](https://choosealicense.com/licenses/mit/)

