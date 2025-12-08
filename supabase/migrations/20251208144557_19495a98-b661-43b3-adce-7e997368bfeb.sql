-- Add content_hash column to media table for content protection
ALTER TABLE public.media 
ADD COLUMN content_hash TEXT DEFAULT NULL;

-- Add is_protected column to track if hash is stored on blockchain
ALTER TABLE public.media 
ADD COLUMN is_protected BOOLEAN DEFAULT FALSE;

-- Create index for searching by content hash
CREATE INDEX idx_media_content_hash ON public.media(content_hash) WHERE content_hash IS NOT NULL;