import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_DIMENSION = 1920;
const QUALITY = 0.85;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all media items from the database
    const { data: mediaItems, error: fetchError } = await supabase
      .from('media')
      .select('id, url, type')
      .eq('type', 'image');

    if (fetchError) {
      throw new Error(`Failed to fetch media: ${fetchError.message}`);
    }

    console.log(`Found ${mediaItems?.length || 0} images to process`);

    const results = {
      processed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const item of mediaItems || []) {
      try {
        // Extract file path from URL
        const urlPattern = /\/storage\/v1\/object\/public\/media\/(.+)$/;
        const match = item.url.match(urlPattern);
        
        if (!match) {
          console.log(`Skipping ${item.id}: Not a storage URL`);
          results.skipped++;
          continue;
        }

        const filePath = match[1];
        
        // Check if already optimized (ends with .webp)
        if (filePath.endsWith('.webp')) {
          console.log(`Skipping ${item.id}: Already WebP`);
          results.skipped++;
          continue;
        }

        console.log(`Processing: ${filePath}`);

        // Download the original image
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('media')
          .download(filePath);

        if (downloadError || !fileData) {
          throw new Error(`Download failed: ${downloadError?.message}`);
        }

        // Convert blob to base64 for processing
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Check file size - if already small, skip optimization
        const originalSize = uint8Array.length;
        if (originalSize < 100 * 1024) { // Less than 100KB
          console.log(`Skipping ${item.id}: Already small (${(originalSize / 1024).toFixed(1)}KB)`);
          results.skipped++;
          continue;
        }

        // For server-side, we'll use the storage render endpoint to get optimized version
        // Then re-upload the optimized version
        const optimizedUrl = `${supabaseUrl}/storage/v1/render/image/public/media/${filePath}?width=${MAX_DIMENSION}&quality=${Math.round(QUALITY * 100)}&format=webp`;
        
        const optimizedResponse = await fetch(optimizedUrl);
        
        if (!optimizedResponse.ok) {
          throw new Error(`Optimization fetch failed: ${optimizedResponse.status}`);
        }

        const optimizedBlob = await optimizedResponse.blob();
        const optimizedSize = optimizedBlob.size;

        // Only replace if we got significant savings (at least 10%)
        if (optimizedSize >= originalSize * 0.9) {
          console.log(`Skipping ${item.id}: No significant savings`);
          results.skipped++;
          continue;
        }

        // Generate new filename with .webp extension
        const newFilePath = filePath.replace(/\.[^/.]+$/, '.webp');
        
        // Upload optimized version
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(newFilePath, optimizedBlob, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Update database with new URL
        const newUrl = `${supabaseUrl}/storage/v1/object/public/media/${newFilePath}`;
        
        const { error: updateError } = await supabase
          .from('media')
          .update({ url: newUrl })
          .eq('id', item.id);

        if (updateError) {
          throw new Error(`DB update failed: ${updateError.message}`);
        }

        // Optionally delete old file (uncomment if you want to clean up)
        // await supabase.storage.from('media').remove([filePath]);

        console.log(`Optimized ${item.id}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB`);
        results.processed++;

      } catch (itemError) {
        const errorMsg = `Error processing ${item.id}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log(`Completed: ${results.processed} processed, ${results.skipped} skipped, ${results.errors.length} errors`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Optimization error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
