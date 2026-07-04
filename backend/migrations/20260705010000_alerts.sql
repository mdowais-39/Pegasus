-- Investigator alerts: surfaced the moment a statement finishes processing when
-- it contains serious findings (HIGH/CRITICAL accounts, round-trips, rapid
-- pass-through). Drives the nav bell, the completion toast and the alerts panel.
CREATE TABLE IF NOT EXISTS alerts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    statement_id UUID REFERENCES statements(id),
    account      TEXT,
    severity     TEXT NOT NULL,          -- HIGH | CRITICAL
    category     TEXT,                   -- tag key: MALICIOUS | CIRCULAR | RAPID_PASSTHROUGH | ...
    title        TEXT NOT NULL,
    detail       TEXT,
    created_at   TIMESTAMP DEFAULT NOW(),
    acknowledged BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_alerts_ack ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_statement ON alerts(statement_id);
