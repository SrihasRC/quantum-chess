-- Create player_stats table
CREATE TABLE IF NOT EXISTS player_stats (
    username TEXT PRIMARY KEY,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for player_stats 
CREATE POLICY "Anyone can view player stats" ON player_stats
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert player stats" ON player_stats
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update player stats" ON player_stats
    FOR UPDATE USING (true);

-- Create index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS player_stats_points_idx ON player_stats(points DESC);

-- Add username columns to game_rooms for tracking
ALTER TABLE game_rooms 
ADD COLUMN IF NOT EXISTS creator_username TEXT,
ADD COLUMN IF NOT EXISTS opponent_username TEXT;
