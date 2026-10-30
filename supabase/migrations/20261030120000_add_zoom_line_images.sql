ALTER TABLE public.utility_points
  ADD COLUMN IF NOT EXISTS zoom_in_image_url TEXT,
  ADD COLUMN IF NOT EXISTS zoom_out_image_url TEXT;

NOTIFY pgrst, 'reload schema';
