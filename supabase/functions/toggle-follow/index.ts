import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { follower_id, following_id } = await req.json();

    if (!follower_id || !following_id) {
      return new Response(
        JSON.stringify({ error: "follower_id and following_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if follow exists
    const { data: existingFollow, error: fetchError } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", follower_id)
      .eq("following_id", following_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingFollow) {
      // Unfollow
      const { error: deleteError } = await supabase
        .from("follows")
        .delete()
        .eq("id", existingFollow.id);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ following: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Follow
    const { error: insertError } = await supabase
      .from("follows")
      .insert({ follower_id, following_id });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ following: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error toggling follow:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
