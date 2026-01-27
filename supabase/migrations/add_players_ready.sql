-- Add columns to track if players are in the room
ALTER TABLE game_rooms
ADD COLUMN creator_ready BOOLEAN DEFAULT FALSE,
ADD COLUMN opponent_ready BOOLEAN DEFAULT FALSE;
