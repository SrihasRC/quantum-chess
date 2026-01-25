-- Add winner_reason column to game_rooms table
ALTER TABLE game_rooms
ADD COLUMN IF NOT EXISTS winner_reason TEXT CHECK (winner_reason IN ('checkmate', 'resignation', 'opponent_left', 'draw'));
