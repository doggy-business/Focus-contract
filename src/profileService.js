// src/profileService.js
// Profile database operations.

import { supabase } from "./supabaseClient.js";

// ── Load a profile row ─────────────────────────────────────────
// Returns the profile object or null.
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    // PGRST116 = row not found — not a real error, just new user
    if (error.code !== "PGRST116") {
      console.error("fetchProfile:", error.message);
    }
    return null;
  }
  return data;
}

// ── Create a profile (called after sign-up if trigger didn't fire) ─
export async function createProfile(userId, email) {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id:                   userId,
      email:                email,
      plan:                 "free",
      onboarding_completed: false,
    })
    .select()
    .single();

  if (error) {
    console.error("createProfile:", error.message);
    return null;
  }
  return data;
}

// ── Mark onboarding complete ───────────────────────────────────
export async function markOnboardingComplete(userId) {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId);

  if (error) console.error("markOnboardingComplete:", error.message);
}

// ── Upgrade plan (called by Stripe webhook handler — not client) ──
// Included here for completeness; webhook uses service_role key.
export async function upgradePlan(userId) {
  const { error } = await supabase
    .from("profiles")
    .update({ plan: "pro" })
    .eq("id", userId);

  if (error) console.error("upgradePlan:", error.message);
}
