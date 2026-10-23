import create from 'zustand';
import { supabase } from '../lib/supabaseClient';

const USER_PROFILE_COLUMNS =
  'id,email,username,steam_id,profile_picture,role,banned,ban_reason,banned_at,created_at';

const persistSession = (user, token) => {
  if (typeof sessionStorage === 'undefined') return;

  if (user) {
    sessionStorage.setItem('user', JSON.stringify(user));
  } else {
    sessionStorage.removeItem('user');
  }

  if (token) {
    sessionStorage.setItem('token', token);
  } else {
    sessionStorage.removeItem('token');
  }
};

const getStoredSession = () => {
  if (typeof sessionStorage === 'undefined') return { user: null, token: null };

  const storedToken = sessionStorage.getItem('token');

  return {
    user: null,
    token: storedToken || null,
  };
};

const normalizeUser = (sessionUser, profile) => {
  return {
    ...profile,
    authUserId: sessionUser.id,
    email: sessionUser.email,
    username:
      profile.username ||
      sessionUser.user_metadata?.username ||
      sessionUser.email?.split('@')[0] ||
      '',
    role: profile.role === 'admin' ? 'admin' : 'user',
    banned: profile.banned === true,
  };
};

export const useAuthStore = create((set, get) => {
  const initialSession = getStoredSession();
  let hydrationId = 0;

  const setAuth = (user, token) => {
    persistSession(user, token);
    set({ user, token, authReady: true });
  };

  const clearAuth = () => {
    hydrationId += 1;
    persistSession(null, null);
    set({ user: null, token: null, authReady: true });
  };

  const hydrateSession = async (session) => {
    const currentHydrationId = ++hydrationId;

    if (!session?.access_token || !session?.user?.email) {
      clearAuth();
      return false;
    }

    set({ user: null, token: null, authReady: false });

    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select(USER_PROFILE_COLUMNS)
        .eq('email', session.user.email)
        .single();

      if (error) throw error;
      if (currentHydrationId !== hydrationId) return false;

      setAuth(normalizeUser(session.user, profile), session.access_token);
      return true;
    } catch (error) {
      if (currentHydrationId === hydrationId) {
        console.error('Failed to load authenticated user profile:', error);
        clearAuth();
      }
      return false;
    }
  };

  const initializeAuth = async () => {
    set({ authReady: false });

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      await hydrateSession(session);
    } catch (error) {
      console.error('Failed to restore auth session:', error);
      clearAuth();
    }
  };

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return await hydrateSession(session);
    } catch (error) {
      console.error('Failed to refresh auth session:', error);
      clearAuth();
      return false;
    }
  };

  const login = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return hydrateSession(session);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }

    clearAuth();
  };

  const setUser = (user) => {
    const currentUser = get().user;
    if (!currentUser || !user) return;

    const safeUser = {
      ...currentUser,
      ...user,
      id: currentUser.id,
      authUserId: currentUser.authUserId,
      email: currentUser.email,
      role: currentUser.role,
      banned: currentUser.banned,
      ban_reason: currentUser.ban_reason,
      banned_at: currentUser.banned_at,
    };

    persistSession(safeUser, get().token);
    set({ user: safeUser });
  };

  void initializeAuth();

  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => {
      void hydrateSession(session);
    }, 0);
  });

  return {
    user: null,
    token: initialSession.token,
    authReady: false,
    login,
    logout,
    setUser,
    refreshSession,
    initializeAuth,
  };
});
