-- Add DELETE policy for player_stats table
CREATE POLICY "Anyone can delete player stats" ON player_stats
    FOR DELETE USING (true);
