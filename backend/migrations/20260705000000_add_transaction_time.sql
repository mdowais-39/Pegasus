-- Transaction time-of-day (nullable). Many statements are date-only, so this is
-- optional; when present it powers time-based ordering, the account timeline,
-- and the rapid pass-through velocity detector.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS time TEXT;
