CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('FARMER', 'PROVIDER', 'ADMIN')),
    village VARCHAR(120),
    district VARCHAR(120),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS providers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
    provider_type VARCHAR(30) NOT NULL CHECK (provider_type IN ('EQUIPMENT_OWNER', 'LABOUR_LEADER', 'BOTH')),
    business_name VARCHAR(160) NOT NULL,
    service_area VARCHAR(255),
    rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    trust_score NUMERIC(5,2) NOT NULL DEFAULT 50,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    cancellation_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    no_show_rate NUMERIC(5,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS equipment (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id),
    equipment_type VARCHAR(80) NOT NULL,
    equipment_name VARCHAR(120) NOT NULL,
    description TEXT,
    price_per_day NUMERIC(12,2) NOT NULL CHECK (price_per_day >= 0),
    availability_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS labour_groups (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL REFERENCES providers(id),
    group_name VARCHAR(120) NOT NULL,
    worker_count INTEGER NOT NULL CHECK (worker_count > 0),
    skill_type VARCHAR(100) NOT NULL,
    price_per_day NUMERIC(12,2) NOT NULL CHECK (price_per_day >= 0),
    availability_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    farmer_id BIGINT NOT NULL REFERENCES users(id),
    crop VARCHAR(80) NOT NULL,
    task_type VARCHAR(120) NOT NULL,
    land_area NUMERIC(10,2) NOT NULL CHECK (land_area > 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'ACRE',
    required_workers INTEGER,
    required_equipment VARCHAR(120),
    preferred_date DATE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    farmer_id BIGINT NOT NULL REFERENCES users(id),
    provider_id BIGINT NOT NULL REFERENCES providers(id),
    equipment_id BIGINT REFERENCES equipment(id),
    labour_group_id BIGINT REFERENCES labour_groups(id),
    task_id BIGINT REFERENCES tasks(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    weather_risk VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date >= start_date),
    CHECK (equipment_id IS NOT NULL OR labour_group_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_bookings_equipment_dates
    ON bookings (equipment_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_labour_dates
    ON bookings (labour_group_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(id),
    farmer_id BIGINT NOT NULL REFERENCES users(id),
    provider_id BIGINT NOT NULL REFERENCES providers(id),
    rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews (provider_id);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    type VARCHAR(40) NOT NULL,
    message VARCHAR(500) NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC);
