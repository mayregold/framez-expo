import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../src/supabaseClient';
import { useRouter } from 'expo-router';

export default function SignUp(): React.ReactElement  {
  const router = useRouter();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const validate = (): boolean => {
    if (!name.trim()) { setError('Please enter your full name.'); return false; }
    if (!email.trim()) { setError('Please enter your email.'); return false; }
    const re = /\S+@\S+\.\S+/;
    if (!re.test(email)) { setError('Please enter a valid email.'); return false; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return false; }
    setError(null);
    return true;
  };

  const handleSignUp = async (): Promise<void> => {
    if (!validate()) return;
    setLoading(true);
    try {
      // ⚡ Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // ⚡ Insert profile in public.profiles
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          name,
          avatar_url: `https://i.pravatar.cc/150?u=${data.user.id}`,
        });

        if (profileError) throw profileError;
      }

      Alert.alert(
        'Sign up successful',
        'Please check your email to confirm your account before signing in.',
        [{ text: 'OK', onPress: () => router.push('/SignIn') }]
      );
    } catch (e: any) {
      setError(e.message || 'Error signing up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.title}>Create account</Text>

      <TextInput
        placeholder="Full name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        autoCapitalize="words"
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        onPress={handleSignUp}
        style={[styles.button, loading && { opacity: 0.7 }]}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign up</Text>}
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'center' }}>
        <Text>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/SignIn')}>
          <Text style={{ color: '#2b6cdf' }}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
  button: { backgroundColor: '#2b6cdf', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: 'red', marginBottom: 8, textAlign: 'center' },
});
