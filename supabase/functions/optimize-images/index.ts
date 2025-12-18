import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all media items
    const { data: mediaItems, error: fetchError } = await supabase
      .from('media')
      .select('id, url, type')
      .eq('type', 'image');

    if (fetchError) {
      throw new Error(`Failed to fetch media: ${fetchError.message}`);
    }

    console.log(`Found ${mediaItems?.length || 0} images`);

    // For now, just return info about the images
    // Actual optimization would require external service or Pro plan features
    const results = {
      total: mediaItems?.length || 0,
      message: 'Images listed. Client-side optimization is applied during new uploads.',
      items: mediaItems?.map(item => ({
        id: item.id,
        url: item.url
      }))
    };

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
