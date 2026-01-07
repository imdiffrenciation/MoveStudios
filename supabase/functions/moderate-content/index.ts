import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'No image URL provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(JSON.stringify({ 
        safe: true, 
        reason: 'Moderation unavailable - allowing content' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Moderating content:', imageUrl.substring(0, 100));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a content moderation AI. Analyze images for inappropriate content.
            
You must respond with ONLY a JSON object (no markdown, no code blocks):
{"safe": true/false, "reason": "brief explanation", "categories": ["list", "of", "violations"]}

Flag as unsafe (safe: false) if the image contains:
- Nudity or sexual content (including partial nudity, suggestive poses)
- Gore, violence, or graphic injury
- Hate symbols or slurs
- Drug use or drug paraphernalia
- Weapons pointed at viewer
- Child exploitation of any kind

Flag as safe (safe: true) for:
- Art, illustrations, paintings (unless explicitly sexual/violent)
- Swimwear in appropriate beach/pool context
- Medical/educational content
- Normal everyday photos`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image for content moderation. Is it safe for a general audience platform?'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          safe: true, 
          reason: 'Rate limited - allowing content',
          rateLimited: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // On error, allow content but log it
      return new Response(JSON.stringify({ 
        safe: true, 
        reason: 'Moderation error - allowing content' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('Moderation response:', content);

    // Parse the JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```json?\n?/g, '').replace(/```/g, '');
      }
      
      const result = JSON.parse(cleanContent);
      return new Response(JSON.stringify({
        safe: result.safe ?? true,
        reason: result.reason ?? 'Content analyzed',
        categories: result.categories ?? [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse moderation response:', parseError);
      // If we can't parse, check for obvious unsafe keywords
      const lowerContent = content.toLowerCase();
      const isUnsafe = lowerContent.includes('unsafe') || 
                       lowerContent.includes('nudity') || 
                       lowerContent.includes('explicit') ||
                       lowerContent.includes('"safe": false') ||
                       lowerContent.includes('"safe":false');
      
      return new Response(JSON.stringify({
        safe: !isUnsafe,
        reason: isUnsafe ? 'Content flagged as potentially inappropriate' : 'Content appears safe',
        categories: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Moderation error:', error);
    return new Response(JSON.stringify({ 
      safe: true, 
      reason: 'Error during moderation - allowing content',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 200, // Still return 200 to not block uploads
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});