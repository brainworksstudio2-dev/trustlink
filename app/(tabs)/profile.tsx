import React from 'react';
import { supabase } from '../../src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import UserProfileScreen from '../../src/screens/UserProfileScreen';
import AuthScreen from '../../src/screens/AuthScreen';

export default function ProfileTab() {
  const [session, setSession] = React.useState<Session | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return session ? <UserProfileScreen /> : <AuthScreen />;
}
