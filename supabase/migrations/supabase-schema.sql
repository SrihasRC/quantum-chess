-- Create game_rooms table
CREATE TABLE IF NOT EXISTS game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creator_id TEXT NOT NULL,
    opponent_id TEXT,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
    current_player TEXT NOT NULL DEFAULT 'white' CHECK (current_player IN ('white', 'black')),
    game_state JSONB NOT NULL,
    move_history JSONB DEFAULT '[]'::jsonb,
    winner TEXT CHECK (winner IN ('white', 'black', 'draw'))
);

-- Enable Row Level Security
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Create policies for game_rooms
CREATE POLICY "Anyone can create a game" ON game_rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view games" ON game_rooms
    FOR SELECT USING (true);

CREATE POLICY "Anyone can update games" ON game_rooms
    FOR UPDATE USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS game_rooms_status_idx ON game_rooms(status);
CREATE INDEX IF NOT EXISTS game_rooms_creator_id_idx ON game_rooms(creator_id);
CREATE INDEX IF NOT EXISTS game_rooms_opponent_id_idx ON game_rooms(opponent_id);
