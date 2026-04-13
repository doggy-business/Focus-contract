import { supabase } from "./supabaseClient.js";

export async function fetchCompletedCount(userId) {
  const { count } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");

  return count || 0;
}

export async function insertSession(userId, sessionData) {
  const { data } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      ...sessionData,
    })
    .select()
    .single();

  return data;
}
