import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error('Error getting session:', error.message);
        if (!mounted) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      } catch (e) {
        console.error('Session load failed:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  
  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

   
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name: fullName || 'New User',
        avatar_url: `https://i.pravatar.cc/150?u=${data.user.id}`,
      });

      if (profileError) throw profileError;
    }

    return data;
  };

  
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
