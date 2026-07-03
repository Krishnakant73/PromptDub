-- ============================================================
-- PromptDub Database Schema — Initial Migration
-- PostgreSQL 16+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUM Types ──

CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');
CREATE TYPE session_status AS ENUM ('initializing', 'cloning_voice', 'active', 'paused', 'ended', 'error');
CREATE TYPE platform_type AS ENUM ('youtube', 'twitch', 'other');
CREATE TYPE tts_engine AS ENUM ('cosyvoice2', 'chatterbox_turbo');

-- ── Users & Authentication ──

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(320) NOT NULL,
    password_hash   VARCHAR(128) NOT NULL,
    display_name    VARCHAR(100),
    avatar_url      VARCHAR(512),
    preferred_lang  VARCHAR(10) NOT NULL DEFAULT 'en',
    timezone        VARCHAR(50) DEFAULT 'UTC',
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_created_at ON users (created_at);

-- ── API Keys ──

CREATE TABLE api_keys (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash    VARCHAR(128) NOT NULL,
    key_prefix  VARCHAR(8) NOT NULL,
    name        VARCHAR(100) NOT NULL DEFAULT 'Default',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_api_keys_hash UNIQUE (key_hash)
);

CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX idx_api_keys_hash ON api_keys (key_hash) WHERE is_active = TRUE;

-- ── Subscriptions ──

CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier                    subscription_tier NOT NULL DEFAULT 'free',
    status                  subscription_status NOT NULL DEFAULT 'active',
    monthly_minutes         INTEGER NOT NULL DEFAULT 60,
    minutes_used            INTEGER NOT NULL DEFAULT 0,
    concurrent_sessions     INTEGER NOT NULL DEFAULT 1,
    stripe_customer_id      VARCHAR(64),
    stripe_subscription_id  VARCHAR(64),
    current_period_start    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at            TIMESTAMPTZ,
    CONSTRAINT uq_subscriptions_user UNIQUE (user_id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status) WHERE status = 'active';
CREATE INDEX idx_subscriptions_stripe ON subscriptions (stripe_customer_id);

-- ── Translation Sessions ──

CREATE TABLE translation_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_lang         VARCHAR(10) NOT NULL,
    target_lang         VARCHAR(10) NOT NULL,
    platform            platform_type NOT NULL DEFAULT 'youtube',
    stream_url          VARCHAR(2048),
    stream_title        VARCHAR(500),
    status              session_status NOT NULL DEFAULT 'initializing',
    tts_engine_used     tts_engine NOT NULL DEFAULT 'cosyvoice2',
    duration_seconds    INTEGER DEFAULT 0,
    chunks_processed    INTEGER DEFAULT 0,
    words_translated    INTEGER DEFAULT 0,
    avg_latency_ms      INTEGER,
    p95_latency_ms      INTEGER,
    voice_profile_ready BOOLEAN NOT NULL DEFAULT FALSE,
    speaker_similarity  REAL,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON translation_sessions (user_id);
CREATE INDEX idx_sessions_status ON translation_sessions (status) WHERE status IN ('initializing', 'active');
CREATE INDEX idx_sessions_started ON translation_sessions (started_at DESC);
CREATE INDEX idx_sessions_user_date ON translation_sessions (user_id, started_at DESC);

-- ── Session Transcripts ──

CREATE TABLE session_transcripts (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id              UUID NOT NULL REFERENCES translation_sessions(id) ON DELETE CASCADE,
    chunk_index             INTEGER NOT NULL,
    original_text           TEXT NOT NULL,
    translated_text         TEXT NOT NULL,
    source_lang             VARCHAR(10) NOT NULL,
    target_lang             VARCHAR(10) NOT NULL,
    chunk_start_ms          INTEGER NOT NULL,
    chunk_end_ms            INTEGER NOT NULL,
    latency_ms              INTEGER NOT NULL,
    stt_confidence          REAL,
    translation_confidence  REAL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transcripts_session ON session_transcripts (session_id, chunk_index);
CREATE INDEX idx_transcripts_session_time ON session_transcripts (session_id, chunk_start_ms);

-- ── Usage Events ──

CREATE TABLE usage_events (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id  UUID REFERENCES translation_sessions(id) ON DELETE SET NULL,
    event_type  VARCHAR(50) NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_user_id ON usage_events (user_id);
CREATE INDEX idx_usage_event_type ON usage_events (event_type, created_at DESC);
CREATE INDEX idx_usage_created_at ON usage_events (created_at DESC);
CREATE INDEX idx_usage_metadata ON usage_events USING GIN (metadata);

-- ── Daily Analytics ──

CREATE TABLE daily_analytics (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date                DATE NOT NULL,
    total_sessions      INTEGER NOT NULL DEFAULT 0,
    total_minutes       INTEGER NOT NULL DEFAULT 0,
    total_words         INTEGER NOT NULL DEFAULT 0,
    total_chunks        INTEGER NOT NULL DEFAULT 0,
    avg_latency_ms      INTEGER,
    p95_latency_ms      INTEGER,
    languages_used      VARCHAR(10)[] DEFAULT '{}',
    platforms_used      platform_type[] DEFAULT '{}',
    CONSTRAINT uq_daily_analytics UNIQUE (user_id, date)
);

CREATE INDEX idx_daily_analytics_user_date ON daily_analytics (user_id, date DESC);

-- ── Supported Languages ──

CREATE TABLE supported_languages (
    code                    VARCHAR(10) PRIMARY KEY,
    name_english            VARCHAR(100) NOT NULL,
    name_native             VARCHAR(100) NOT NULL,
    stt_supported           BOOLEAN NOT NULL DEFAULT FALSE,
    translation_supported   BOOLEAN NOT NULL DEFAULT FALSE,
    tts_supported           BOOLEAN NOT NULL DEFAULT FALSE,
    tts_engine              tts_engine,
    tts_quality             VARCHAR(20) DEFAULT 'standard',
    min_tier                subscription_tier NOT NULL DEFAULT 'free',
    is_active               BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO supported_languages (code, name_english, name_native, stt_supported, translation_supported, tts_supported, tts_engine, tts_quality, min_tier) VALUES
('en', 'English',    'English',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('hi', 'Hindi',      'हिन्दी',      TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('es', 'Spanish',    'Español',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('fr', 'French',     'Français',   TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('de', 'German',     'Deutsch',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('ja', 'Japanese',   '日本語',      TRUE, TRUE, TRUE, 'cosyvoice2',       'high',     'starter'),
('ko', 'Korean',     '한국어',       TRUE, TRUE, TRUE, 'cosyvoice2',       'high',     'starter'),
('zh', 'Chinese',    '中文',        TRUE, TRUE, TRUE, 'cosyvoice2',       'high',     'starter'),
('pt', 'Portuguese', 'Português',  TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'free'),
('it', 'Italian',    'Italiano',   TRUE, TRUE, TRUE, 'chatterbox_turbo', 'high',     'starter'),
('ru', 'Russian',    'Русский',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'starter'),
('ar', 'Arabic',     'العربية',     TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'starter'),
('tr', 'Turkish',    'Türkçe',     TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('pl', 'Polish',     'Polski',     TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('nl', 'Dutch',      'Nederlands', TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('sv', 'Swedish',    'Svenska',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('cs', 'Czech',      'Čeština',    TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('ro', 'Romanian',   'Română',     TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('hu', 'Hungarian',  'Magyar',     TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('el', 'Greek',      'Ελληνικά',   TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('fi', 'Finnish',    'Suomi',      TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('da', 'Danish',     'Dansk',      TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro'),
('no', 'Norwegian',  'Norsk',      TRUE, TRUE, TRUE, 'chatterbox_turbo', 'standard', 'pro');

-- ── Views ──

CREATE VIEW v_user_dashboard AS
SELECT
    u.id AS user_id,
    u.email,
    u.display_name,
    s.tier,
    s.status AS subscription_status,
    s.monthly_minutes,
    s.minutes_used,
    s.monthly_minutes - s.minutes_used AS minutes_remaining,
    (SELECT COUNT(*) FROM translation_sessions ts WHERE ts.user_id = u.id AND ts.status = 'active') AS active_sessions,
    s.concurrent_sessions AS max_concurrent,
    u.last_login_at
FROM users u
JOIN subscriptions s ON s.user_id = u.id
WHERE u.is_active = TRUE;

CREATE VIEW v_session_summary AS
SELECT
    ts.id AS session_id,
    ts.user_id,
    ts.source_lang,
    ts.target_lang,
    ts.platform,
    ts.status,
    ts.duration_seconds,
    ts.words_translated,
    ts.avg_latency_ms,
    ts.speaker_similarity,
    ts.started_at,
    ts.ended_at,
    COUNT(st.id) AS total_chunks,
    AVG(st.latency_ms)::INTEGER AS computed_avg_latency
FROM translation_sessions ts
LEFT JOIN session_transcripts st ON st.session_id = ts.id
GROUP BY ts.id;
