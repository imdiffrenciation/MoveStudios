-- Add INSERT policy for media table
CREATE POLICY "Users can insert their own media" 
ON public.media 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

-- Add UPDATE policy for media table
CREATE POLICY "Users can update their own media" 
ON public.media 
FOR UPDATE 
USING (auth.uid()::text = user_id);

-- Add DELETE policy for media table
CREATE POLICY "Users can delete their own media" 
ON public.media 
FOR DELETE 
USING (auth.uid()::text = user_id);