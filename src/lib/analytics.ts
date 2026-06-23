import { supabase } from '@/lib/supabase/client';

export async function logAnalyticsEvent(eventType: string, eventData: Record<string, unknown> = {}) {
  // 1. Console logging for development feedback
  console.log(`[Analytics Event] ${eventType}:`, eventData);

  // 2. Extract user_id if present
  const userId = eventData.user_id as string || null;

  // 3. Write event to Supabase database using async/await to avoid PromiseLike issues
  try {
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
      });

    if (error) {
      console.error('Failed to log analytics event to Supabase:', error.message);
    }
  } catch (err) {
    console.error('Unexpected error logging analytics event:', err);
  }
}
