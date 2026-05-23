import supabase from './supabaseClient';

const supabaseAuth = {
  signInWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/login'
      }
    });

    if (error) throw error;
    return data;
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  getSessionFromUrl: async () => {
    try {
      const { data, error } =
        await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

      if (error) throw error;

      return data;
    } catch (err) {
      console.error('OAuth session error:', err);

      // fallback
      const { data } = await supabase.auth.getSession();
      return data;
    }
  },

  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    return data;
  }
};

export default supabaseAuth;