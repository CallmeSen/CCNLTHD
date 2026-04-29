FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY app/ ./app/
COPY main.py .

EXPOSE 8082

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8082"]
