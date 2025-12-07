import { View, Text, TextInput, Pressable } from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login(email, password);
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

        <Link href="/(auth)/register" asChild>
          <Pressable className="mt-4">
            <Text className="text-textSecondary text-center">
              Pas de compte ?{' '}
              <Text className="text-primary">Créer un compte</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
