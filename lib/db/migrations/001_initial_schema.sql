-- OHLCV
CREATE TABLE IF NOT EXISTS ohlcv (
    symbol VARCHAR NOT NULL,
    interval VARCHAR NOT NULL,
    timestamp BIGINT NOT NULL,
    open DOUBLE NOT NULL,
    high DOUBLE NOT NULL,
    low DOUBLE NOT NULL,
    close DOUBLE NOT NULL,
    volume DOUBLE NOT NULL,
    taker_buy_volume DOUBLE,
    quote_volume DOUBLE,
    _inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    _source VARCHAR DEFAULT 'binance',
    PRIMARY KEY (symbol, interval, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_time ON ohlcv(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ohlcv_interval ON ohlcv(interval);

-- Open Interest
CREATE TABLE IF NOT EXISTS open_interest (
    symbol VARCHAR NOT NULL,
    interval VARCHAR NOT NULL,
    timestamp BIGINT NOT NULL,
    open_interest DOUBLE NOT NULL,
    oi_change_percent DOUBLE,
    oi_delta DOUBLE,
    _inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (symbol, interval, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_oi_symbol_time ON open_interest(symbol, timestamp DESC);

-- Funding Rate
CREATE TABLE IF NOT EXISTS funding_rate (
    symbol VARCHAR NOT NULL,
    funding_time BIGINT NOT NULL,
    funding_rate DOUBLE NOT NULL,
    mark_price DOUBLE NOT NULL,
    index_price DOUBLE,
    settled BOOLEAN DEFAULT FALSE,
    _inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (symbol, funding_time)
);

CREATE INDEX IF NOT EXISTS idx_funding_symbol_time ON funding_rate(symbol, funding_time DESC);

-- Liquidations
CREATE TABLE IF NOT EXISTS liquidations (
    id VARCHAR PRIMARY KEY,
    symbol VARCHAR NOT NULL,
    timestamp BIGINT NOT NULL,
    side VARCHAR NOT NULL,
    price DOUBLE NOT NULL,
    quantity DOUBLE NOT NULL,
    value_in_usd DOUBLE,
    _inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_liq_symbol_time ON liquidations(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_liq_side ON liquidations(side);

-- Long/Short Ratio
CREATE TABLE IF NOT EXISTS long_short_ratio (
    symbol VARCHAR NOT NULL,
    interval VARCHAR NOT NULL,
    timestamp BIGINT NOT NULL,
    long_account_ratio DOUBLE NOT NULL,
    short_account_ratio DOUBLE NOT NULL,
    long_short_ratio DOUBLE NOT NULL,
    _inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (symbol, interval, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_lsr_symbol_time ON long_short_ratio(symbol, timestamp DESC);

-- Taker Flow
CREATE TABLE IF NOT EXISTS taker_flow (
    symbol VARCHAR NOT NULL,
    interval VARCHAR NOT NULL,
    timestamp BIGINT NOT NULL,
    buy_volume DOUBLE NOT NULL,
    sell_volume DOUBLE NOT NULL,
    buy_sell_ratio DOUBLE NOT NULL,
    net_flow DOUBLE NOT NULL,
    _inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (symbol, interval, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_taker_flow_symbol_time ON taker_flow(symbol, timestamp DESC);

-- Dataset Metadata
CREATE TABLE IF NOT EXISTS dataset_metadata (
    dataset_id VARCHAR PRIMARY KEY,
    symbol VARCHAR NOT NULL,
    data_type VARCHAR NOT NULL,
    interval VARCHAR,
    start_timestamp BIGINT NOT NULL,
    end_timestamp BIGINT NOT NULL,
    version VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    row_count INT,
    quality_score DOUBLE,
    last_verified_at TIMESTAMP,
    metadata JSON
);
