-- Update player_stats to support decimal points (for piece count bonus)
ALTER TABLE player_stats 
ALTER COLUMN points TYPE DECIMAL(10, 2);
