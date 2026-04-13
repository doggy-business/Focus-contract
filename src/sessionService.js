import { supabase } from "./supabaseClient.js";

export async function fetchSessions(userId) {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchSessions:", error.message);
    return [];
  }

  return data || [];
}

export async function fetchCompletedCount(userId) {
  const { count, error } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");

  if (error) {
    console.error("fetchCompletedCount:", error.message);
    return 0;
  }

  return count || 0;
}

export async function insertSession(userId, sessionData) {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      task_name: sessionData.task_name,
      status: sessionData.status,
      timer_duration_seconds: sessionData.timer_duration_seconds,
      time_elapsed_seconds: sessionData.time_elapsed_seconds,
      mode: sessionData.mode,
      impact_statement: sessionData.impact_statement ?? "",
      failure_reason: sessionData.failure_reason ?? null,
      failure_reason_text: sessionData.failure_reason_text ?? null,
      notes: sessionData.notes ?? null,
      output_text: sessionData.output_text ?? null,
      output_category: sessionData.output_category ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("insertSession:", error.message);
    return null;
  }

  return data;
}

export async function updateSession(sessionId, updates) {
  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error("updateSession:", error.message);
    return null;
  }

  return data;
}
