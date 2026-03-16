# Tạo các database khi container bắt đầu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE order_db;
    CREATE DATABASE inventory_db;
EOSQL
