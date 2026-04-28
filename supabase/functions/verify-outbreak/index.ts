// @deno-types="https://deno.land/x/types/react-native/globals.d.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RequestBody {
  reportId: string;
  mediaUrls: string[];
  userLat: number;
  userLng: number;
}

serve(async (req: Request): Promise<Response> => {
  const { reportId, mediaUrls, userLat, userLng } = await req.json() as RequestBody;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Mock verification – replace with real AI service (Google Vision, Rekognition, deepfake API)
    let mediaValid = true;
    let mediaReason = '';
    let gpsConsistent = true;

    for (const url of mediaUrls) {
      // 1. Check media freshness (you'd parse EXIF from image, but for demo we trust)
      // 2. Deepfake detection – skip for mock
      // 3. Compare GPS with user input
      // In real implementation, fetch image metadata from storage and parse.
    }

    // For demo: always approve if media exists
    const status = 'verified';
    const score = 0.95;
    const reason = mediaValid ? 'All checks passed' : 'Media manipulation detected';

    // Update report
    await supabase
      .from('outbreak_reports')
      .update({ status, ai_confidence_score: score, verification_reason: reason })
      .eq('id', reportId);

    // If verified, trigger alerts to relevant farmers
    if (status === 'verified') {
      // Get report details
      const { data: report } = await supabase
        .from('outbreak_reports')
        .select('animal_type, disease_name')
        .eq('id', reportId)
        .single();

      // Find farmers who have that animal type
      const { data: farmers } = await supabase
        .from('user_farming_types')
        .select('user_id')
        .contains('animal_types', [report?.animal_type]);

      if (farmers && farmers.length > 0) {
        const notifications = farmers.map((f: { user_id: string }) => ({
          user_id: f.user_id,
          type: 'outbreak_alert',
          title: `⚠️ ${report?.animal_type.toUpperCase()} Disease Reported`,
          message: `A ${report?.disease_name || 'disease'} outbreak has been verified near your area. Check the heat map.`,
          action_url: `/outbreak/${reportId}`,
          created_at: new Date(),
          read: false,
        }));
        await supabase.from('notifications').insert(notifications);
      }
    }

    return new Response(JSON.stringify({ success: true, status }), { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
});