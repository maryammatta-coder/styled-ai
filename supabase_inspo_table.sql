-- Create inspo_images table
CREATE TABLE IF NOT EXISTS public.inspo_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.inspo_images ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view their own inspo images
CREATE POLICY "Users can view their own inspo images"
  ON public.inspo_images
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own inspo images
CREATE POLICY "Users can insert their own inspo images"
  ON public.inspo_images
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own inspo images
CREATE POLICY "Users can update their own inspo images"
  ON public.inspo_images
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own inspo images
CREATE POLICY "Users can delete their own inspo images"
  ON public.inspo_images
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS inspo_images_user_id_idx ON public.inspo_images(user_id);
CREATE INDEX IF NOT EXISTS inspo_images_created_at_idx ON public.inspo_images(created_at DESC);
