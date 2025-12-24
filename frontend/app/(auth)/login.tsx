import { View, Text, TextInput, Pressable } from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithGoogle, isLoading, error, isGoogleReady } = useAuth();

  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (err) {
      // Error is already handled in useAuth
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      // Error is already handled in useAuth
    }
  };

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="text-4xl font-bold text-textPrimary mb-8">Connexion</Text>

      <View className="space-y-4">
        <View>
          <Text className="text-textSecondary mb-2">Email</Text>
          <TextInput
            className="bg-surface text-textPrimary px-4 py-3 rounded-lg"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>

        <View>
          <Text className="text-textSecondary mb-2">Mot de passe</Text>
          <TextInput
            className="bg-surface text-textPrimary px-4 py-3 rounded-lg"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
        </View>

        {error && (
          <Text className="text-error text-sm">{error}</Text>
        )}

        <Pressable
          className={`bg-primary py-4 rounded-lg items-center mt-4 ${isLoading ? 'opacity-50' : ''}`}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text className="text-white font-semibold text-lg">
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </Text>
        </Pressable>

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-[1px] bg-border" />
          <Text className="text-textSecondary mx-4">ou</Text>
          <View className="flex-1 h-[1px] bg-border" />
        </View>

        <Pressable
          className={`bg-surface border border-border py-4 rounded-lg items-center flex-row justify-center ${!isGoogleReady || isLoading ? 'opacity-50' : ''}`}
          onPress={handleGoogleLogin}
          disabled={!isGoogleReady || isLoading}
        >
          <Ionicons name="logo-google" size={20} color="#DB4437" style={{ marginRight: 8 }} />
          <Text className="text-textPrimary font-semibold text-lg">
            Continuer avec Google
          </Text>
        </Pressable>

        <Link href="/(auth)/register" asChild>
          <Pressable>
            <Text className="text-textSecondary text-center mt-6">
              Pas de compte ?{' '}
              <Text className="text-primary">Créer un compte</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
