import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const { data } = await supabase.auth.getSession();

      if (data?.session?.user) {
        setUser(data.session.user);
        await loadUserData(data.session.user.id);
      }
    } catch (err) {
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserData(userId) {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setProfile(profileData || null);
      setSessions(sessionsData || []);
    } catch (err) {
      console.error("loadUserData error:", err);
    }
  }

  async function signIn() {
    const email = prompt("Enter email:");
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      alert("Error sending login email");
    } else {
      alert("Check your email for login link");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSessions([]);
  }

  if (loading) {
    return <div style={styles.center}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={styles.center}>
        <h1>CONTR-ACT</h1>
        <button onClick={signIn}>Sign In</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>CONTR-ACT</h1>

      <button onClick={signOut}>Sign Out</button>

      <div style={styles.card}>
        <h2>Profile</h2>
        <pre>{JSON.stringify(profile, null, 2)}</pre>
      </div>

      <div style={styles.card}>
        <h2>Sessions</h2>
        {sessions.length === 0 ? (
          <p>No sessions yet</p>
        ) : (
          sessions.map((s) => (
            <div key={s.id} style={styles.session}>
              <p><strong>{s.task_name}</strong></p>
              <p>Status: {s.status}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "#0D0D0F",
    color: "#fff",
    minHeight: "100vh",
    padding: "20px",
  },
  center: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#0D0D0F",
    color: "#fff",
  },
  card: {
    background: "#1A1A1D",
    padding: "15px",
    borderRadius: "10px",
    marginTop: "15px",
  },
  session: {
    borderBottom: "1px solid #333",
    padding: "10px 0",
  },
};
