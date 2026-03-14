CREATE DATABASE inventory_db;
CREATE DATABASE order_db;
CREATE USER inventory_user WITH PASSWORD 'inventory_password';
CREATE USER order_user WITH PASSWORD 'order_password';
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;
GRANT ALL PRIVILEGES ON DATABASE order_db TO order_user;
