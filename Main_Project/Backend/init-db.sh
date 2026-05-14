#!/bin/bash
# Creates one PostgreSQL database per microservice.
# Mounted to /docker-entrypoint-initdb.d/ in the PostgreSQL container.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE user_db;
    CREATE DATABASE market_data_db;
    CREATE DATABASE portfolio_db;
    CREATE DATABASE notification_db;

    CREATE DATABASE user_db_test;
    CREATE DATABASE portfolio_db_test;
    CREATE DATABASE notification_db_test;

    GRANT ALL PRIVILEGES ON DATABASE user_db TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE market_data_db TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE portfolio_db TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE notification_db TO $POSTGRES_USER;

    GRANT ALL PRIVILEGES ON DATABASE user_db_test TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE portfolio_db_test TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE notification_db_test TO $POSTGRES_USER;
EOSQL

echo "All service databases created (including test databases)."
