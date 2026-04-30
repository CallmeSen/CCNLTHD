# LangGraph Financial Advisor - Makefile

.PHONY: help install setup-db load-data run test clean

help:
	@echo "Available commands:"
	@echo "  make install     - Install dependencies"
	@echo "  make setup-db    - Initialize database"
	@echo "  make load-data   - Load synthetic data"
	@echo "  make run         - Run FastAPI server"
	@echo "  make test        - Run tests"
	@echo "  make clean       - Clean temporary files"

install:
	pip install -r requirements.txt

setup-db:
	python scripts/setup_db.py

load-data:
	python scripts/load_data.py --data-dir ../generated_mf_data

run:
	uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest tests/ -v

test-cov:
	pytest --cov=src tests/ --cov-report=html

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f
