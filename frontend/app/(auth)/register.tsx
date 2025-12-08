import { View, Text, TextInput, Pressable } from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { register, isLoading, error } = useAuth();

  const handleRegister = async () => {
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setLocalError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      await register(email, password, name);
    } catch (err) {
      // Error is already handled in useAuth
    }
  };

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="text-4xl font-bold text-textPrimary mb-12">Inscription</Text>

      <View className="space-y-4">
        <View>
          <Text className="text-textSecondary mb-2">Nom</Text>
          <TextInput
            className="bg-surface text-textPrimary px-4 py-3 rounded-lg"
            value={name}
            onChangeText={setName}
            editable={!isLoading}
          />
        </View>

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

        <View>
          <Text className="text-textSecondary mb-2">Confirmer le mot de passe</Text>
          <TextInput
            className="bg-surface text-textPrimary px-4 py-3 rounded-lg"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!isLoading}
          />
        </View>

        {(error || localError) && (
          <Text className="text-error text-sm">{error || localError}</Text>
        )}

        <Pressable
          className={`bg-primary py-4 rounded-lg items-center mt-4 ${isLoading ? 'opacity-50' : ''}`}
          onPress={handleRegister}
          disabled={isLoading}
        >
          <Text className="text-white font-semibold text-lg">
            {isLoading ? 'Création...' : 'Créer un compte'}
          </Text>
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable className="mt-4">
            <Text className="text-textSecondary text-center">
              Déjà un compte ?{' '}
              <Text className="text-primary">Se connecter</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
