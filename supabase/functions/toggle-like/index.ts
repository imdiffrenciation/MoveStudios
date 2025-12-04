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
    const { user_id, media_id } = await req.json();

    if (!user_id || !media_id) {
      return new Response(
        JSON.stringify({ error: "user_id and media_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if like exists
    const { data: existingLike, error: fetchError } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", user_id)
      .eq("media_id", media_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingLike) {
      // Remove like
      const { error: deleteError } = await supabase
        .from("likes")
        .delete()
        .eq("id", existingLike.id);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ liked: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add like
    const { error: insertError } = await supabase
      .from("likes")
      .insert({ user_id, media_id });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ liked: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error toggling like:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
