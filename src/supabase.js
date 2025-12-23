import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://atvczvzygjsqrelrwtic.supabase.co";
const supabaseAnonKey = "sb_publishable_9_1I8G64_9dscsA6rAL9Ig_V-sG3fEW";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Auth helper functions that mirror Firebase auth API
export const supabaseAuth = {
  currentUser: null,

  // Initialize auth state listener
  onAuthStateChanged(callback) {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUser = session?.user
        ? {
            uid: session.user.id,
            email: session.user.email,
            displayName:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0],
          }
        : null;
      callback(this.currentUser);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser = session?.user
        ? {
            uid: session.user.id,
            email: session.user.email,
            displayName:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split("@")[0],
          }
        : null;
      callback(this.currentUser);
    });

    // Return unsubscribe function
    return () => subscription.unsubscribe();
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    this.currentUser = null;
  },
};

// Sign in with email and password
export const signInWithEmailAndPassword = async (
  authInstance,
  email,
  password
) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Update currentUser immediately
  supabaseAuth.currentUser = {
    uid: data.user.id,
    email: data.user.email,
    displayName:
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      data.user.email?.split("@")[0],
  };

  return {
    user: supabaseAuth.currentUser,
  };
};

// Create user with email and password
export const createUserWithEmailAndPassword = async (
  authInstance,
  email,
  password
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  // Update currentUser immediately
  supabaseAuth.currentUser = {
    uid: data.user.id,
    email: data.user.email,
    displayName:
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      data.user.email?.split("@")[0],
  };

  return {
    user: supabaseAuth.currentUser,
  };
};

// Sign in with Google OAuth
export const signInWithPopup = async (authInstance, provider) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) throw error;

  // For OAuth, the redirect will happen and onAuthStateChange will handle the rest
  // Return a promise that never resolves (the page will redirect)
  return new Promise(() => {});
};

// Google provider placeholder (not used directly with Supabase, kept for API compatibility)
export const googleProvider = { providerId: "google.com" };
