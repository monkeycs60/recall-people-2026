import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithGoogle, isLoading, error, isGoogleReady } = useAuth();
  const insets = useSafeAreaInsets();

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
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInUp.duration(600)}
            style={[styles.heroSection, { paddingTop: insets.top + 40 }]}
          >
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            <View style={styles.decorativeCircle3} />

            <Text style={styles.brandTitle}>
              Recall People
            </Text>
            <Text style={styles.tagline}>
              N'oubliez jamais ce qui compte
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(600).delay(200)}
            className="flex-1"
            style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: insets.bottom + 24 }}
          >
            <Text style={styles.sectionTitle}>Connexion</Text>

            <View className="mt-6">
              <Text className="text-textSecondary mb-2 text-sm font-medium">Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
                placeholderTextColor={Colors.textMuted}
                placeholder="votre@email.com"
              />
            </View>

            <View className="mt-4">
              <Text className="text-textSecondary mb-2 text-sm font-medium">Mot de passe</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
                placeholderTextColor={Colors.textMuted}
                placeholder="Votre mot de passe"
              />
            </View>

            {error && (
              <Text className="text-error text-sm mt-3">{error}</Text>
            )}

            <Pressable
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Text>
            </Pressable>

            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[1px] bg-border" />
              <Text className="text-textMuted mx-4 text-sm">ou</Text>
              <View className="flex-1 h-[1px] bg-border" />
            </View>

            <Pressable
              style={[styles.googleButton, (!isGoogleReady || isLoading) && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={!isGoogleReady || isLoading}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" style={{ marginRight: 12 }} />
              <Text style={styles.googleButtonText}>
                Continuer avec Google
              </Text>
            </Pressable>

            <Link href="/(auth)/register" asChild>
              <Pressable className="mt-6">
                <Text className="text-textSecondary text-center">
                  Pas de compte ?{' '}
                  <Text style={{ color: Colors.primary, fontWeight: '600' }}>Creer un compte</Text>
                </Text>
              </Pressable>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    backgroundColor: Colors.primaryLight,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    opacity: 0.1,
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.primary,
    opacity: 0.08,
    bottom: 20,
    left: -40,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    opacity: 0.15,
    top: 60,
    left: 40,
  },
  brandTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 36,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  googleButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
