-- Clear existing game data (cascade to dependent tables)
TRUNCATE TABLE game_rooms CASCADE;

-- Add draw offer column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='game_rooms' AND column_name='draw_offered_by') THEN
        ALTER TABLE game_rooms 
        ADD COLUMN draw_offered_by TEXT CHECK (draw_offered_by IN ('white', 'black'));
    END IF;
END $$;

-- Ensure timer columns have correct defaults (they may exist from tournaments)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='game_rooms' AND column_name='white_time_remaining') THEN
        ALTER TABLE game_rooms 
        ADD COLUMN white_time_remaining INTEGER DEFAULT 300;
    ELSE
        ALTER TABLE game_rooms 
        ALTER COLUMN white_time_remaining SET DEFAULT 300;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='game_rooms' AND column_name='black_time_remaining') THEN
        ALTER TABLE game_rooms 
        ADD COLUMN black_time_remaining INTEGER DEFAULT 300;
    ELSE
        ALTER TABLE game_rooms 
        ALTER COLUMN black_time_remaining SET DEFAULT 300;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='game_rooms' AND column_name='last_move_time') THEN
        ALTER TABLE game_rooms 
        ADD COLUMN last_move_time TIMESTAMP WITH TIME ZONE;
    ELSE
        -- Change column type if it exists as bigint
        ALTER TABLE game_rooms 
        ALTER COLUMN last_move_time TYPE TIMESTAMP WITH TIME ZONE 
        USING to_timestamp(last_move_time / 1000.0);
    END IF;
END $$;

-- Update winner_reason to include timeout and draw_agreement
ALTER TABLE game_rooms 
DROP CONSTRAINT IF EXISTS game_rooms_winner_reason_check;

ALTER TABLE game_rooms 
ADD CONSTRAINT game_rooms_winner_reason_check 
CHECK (winner_reason IN ('checkmate', 'resignation', 'opponent_left', 'draw', 'timeout', 'draw_agreement'));
