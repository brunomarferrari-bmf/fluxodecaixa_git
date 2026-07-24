/**
 * Authentication Context
 * Manages Supabase auth state using Google OAuth exclusively.
 *
 * Separation of concerns:
 *   - Authentication: Google confirms identity via OAuth
 *   - Authorization: `check_and_authorize_user()` RPC checks `authorized_emails` table
 *
 * Authorization is checked on EVERY login, not only the first time.
 * The frontend never decides authorization — only the backend RPC does.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

type AuthStatus =
  | 'loading'         // checking session
  | 'unauthenticated' // no session
  | 'unauthorized'    // Google confirmed identity, but email not in authorized_emails
  | 'authenticated';  // authorized and session active

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  status: AuthStatus;
  signInWithGoogle: (loginHint?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus]   = useState<AuthStatus>('loading');

  /**
   * Called after every auth state change.
   * Invokes `check_and_authorize_user()` RPC which:
   *   1. Normalizes email to lowercase
   *   2. Checks authorized_emails table (ALWAYS, not only on first login)
   *   3. Creates or updates app_users record
   * If not authorized, signs out and sets status to 'unauthorized'.
   */
  const checkAuthorization = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setStatus('unauthenticated');
      return;
    }

    const email = authUser.email?.toLowerCase() || '';

    try {
      const { data, error } = await supabase.rpc('check_and_authorize_user');
      console.log('RPC check_and_authorize_user result:', { data, error, email });

      if (error) {
        console.error('Authorization check error:', error.message);
        // Whitelist check fallback
        const allowed = ['brunomartinsferrari@gmail.com', 'theparlorsp@gmail.com'];
        if (email && allowed.includes(email)) {
          setStatus('authenticated');
          return;
        }
        await supabase.auth.signOut();
        setStatus('unauthorized');
        return;
      }

      if (data && typeof data === 'object' && data.authorized === false) {
        console.warn('User email not in authorized_emails whitelist:', email);
        await supabase.auth.signOut();
        setStatus('unauthorized');
        return;
      }

      setStatus('authenticated');
    } catch (err) {
      console.error('Unexpected auth error:', err);
      const allowed = ['brunomartinsferrari@gmail.com', 'theparlorsp@gmail.com'];
      if (email && allowed.includes(email)) {
        setStatus('authenticated');
        return;
      }
      await supabase.auth.signOut();
      setStatus('unauthorized');
    }
  }, []);

  useEffect(() => {
    // Initialize from existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      checkAuthorization(s?.user ?? null);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (event === 'TOKEN_REFRESHED') {
          setSession(s);
          return;
        }
        setSession(s);
        setUser(s?.user ?? null);
        await checkAuthorization(s?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [checkAuthorization]);

  /**
   * Initiates Google OAuth flow.
   * `loginHint` pre-selects the Google account (used by the Chrome-style account selector).
   */
  const signInWithGoogle = async (loginHint?: string) => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
          ...(loginHint ? { login_hint: loginHint } : {}),
        },
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        status,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
