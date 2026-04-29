from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel


class StockCreate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    ticker: str
    company_name: str
    exchange: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap_vnd: Optional[int] = None

    @field_validator("ticker")
    @classmethod
    def upper_ticker(cls, v: str) -> str:
        return v.upper()


class StockResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )

    id: int
    ticker: str
    company_name: str
    exchange: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap_vnd: Optional[int] = None
    active: bool


class PriceIngest(BaseModel):
    ticker: str
    timestamp: datetime
    open: Optional[Decimal] = None
    high: Optional[Decimal] = None
    low: Optional[Decimal] = None
    close: Decimal
    volume: Optional[int] = None
    interval: str

    @field_validator("ticker")
    @classmethod
    def upper_ticker(cls, v: str) -> str:
        return v.upper()

    @field_validator("interval")
    @classmethod
    def upper_interval(cls, v: str) -> str:
        return v.upper()


class PriceResponse(BaseModel):
    id: int
    ticker: str
    timestamp: datetime
    open: Optional[Decimal] = None
    high: Optional[Decimal] = None
    low: Optional[Decimal] = None
    close: Decimal
    volume: Optional[int] = None
    interval: str

    model_config = {"from_attributes": True}
