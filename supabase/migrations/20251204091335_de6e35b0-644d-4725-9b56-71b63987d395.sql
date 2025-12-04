-- Add INSERT and DELETE policies for likes table
CREATE POLICY "Users can insert their own likes" 
ON public.likes 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own likes" 
ON public.likes 
FOR DELETE 
USING (auth.uid()::text = user_id);

-- Add INSERT and DELETE policies for comments table
CREATE POLICY "Users can insert their own comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.comments 
FOR DELETE 
USING (auth.uid()::text = user_id);

-- Add INSERT and DELETE policies for follows table
CREATE POLICY "Users can insert their own follows" 
ON public.follows 
FOR INSERT 
WITH CHECK (auth.uid()::text = follower_id);

CREATE POLICY "Users can delete their own follows" 
ON public.follows 
FOR DELETE 
USING (auth.uid()::text = follower_id);