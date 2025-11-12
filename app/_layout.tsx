// app/_layout.tsx
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '../src/contexts/AuthContext';
import { supabase } from '../src/supabaseClient';

export default function RootLayout() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SessionContextProvider>
  );
}
