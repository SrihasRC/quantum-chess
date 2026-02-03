-- Create tournament state table
CREATE TABLE IF NOT EXISTS tournament_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    current_round INTEGER DEFAULT 1,
    max_rounds INTEGER DEFAULT 5,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'active', 'pairing', 'completed')),
    auto_start_threshold DECIMAL DEFAULT 0.9,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_tournament CHECK (id = 1)
);

-- Insert initial tournament state
INSERT INTO tournament_state (id, current_round, status) 
VALUES (1, 1, 'not_started')
ON CONFLICT (id) DO NOTHING;

-- Create tournament queue table (players waiting for pairing)
CREATE TABLE IF NOT EXISTS tournament_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    player_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'paired', 'cancelled')),
    game_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(username, round_number)
);

-- Add tournament flag to game_rooms
ALTER TABLE game_rooms 
ADD COLUMN IF NOT EXISTS is_tournament BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tournament_round INTEGER;

-- Add tournament flag to player_stats
ALTER TABLE player_stats
ADD COLUMN IF NOT EXISTS is_tournament_player BOOLEAN DEFAULT FALSE;

-- Enable RLS
ALTER TABLE tournament_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_queue ENABLE ROW LEVEL SECURITY;

-- Policies for tournament_state
CREATE POLICY "Anyone can view tournament state" ON tournament_state
    FOR SELECT USING (true);

CREATE POLICY "Anyone can update tournament state" ON tournament_state
    FOR UPDATE USING (true);

-- Policies for tournament_queue
CREATE POLICY "Anyone can view queue" ON tournament_queue
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert to queue" ON tournament_queue
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update queue" ON tournament_queue
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete from queue" ON tournament_queue
    FOR DELETE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS tournament_queue_round_idx ON tournament_queue(round_number);
CREATE INDEX IF NOT EXISTS tournament_queue_status_idx ON tournament_queue(status);
CREATE INDEX IF NOT EXISTS game_rooms_tournament_idx ON game_rooms(is_tournament, tournament_round);
