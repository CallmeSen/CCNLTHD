from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_host: str = "localhost"
    db_username: str = "postgres"
    db_password: str = "postgres"
    db_name: str = "market_data_db"
    kafka_brokers: str = "localhost:9092"
    eureka_host: str = "localhost"
    app_port: int = 8082
    vnstock_api_key: Optional[str] = None  # Free key: https://vnstocks.com/login

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.db_username}:{self.db_password}"
            f"@{self.db_host}:5432/{self.db_name}"
        )

    @property
    def eureka_server(self) -> str:
        return f"http://{self.eureka_host}:8761/eureka"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
