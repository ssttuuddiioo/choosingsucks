-- Add match requirement and multiple matches options to sessions table
ALTER TABLE sessions 
ADD COLUMN match_requirement TEXT DEFAULT 'all' CHECK (match_requirement IN ('all', 'majority')),
ADD COLUMN allow_multiple_matches BOOLEAN DEFAULT false;
