import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const LOGIN_ILLUSTRATION = require('@/assets/ai-assets/two-guys-chatting-coffee.png');

export default function LoginScreen() {
  const { t } = useTranslation();
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
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInUp.duration(600)}
            style={[styles.heroSection, { paddingTop: insets.top + 20 }]}
          >
            <Image
              source={LOGIN_ILLUSTRATION}
              style={styles.heroIllustration}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>
              Recall People
            </Text>
            <Text style={styles.tagline}>
              {t('auth.tagline')}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(600).delay(200)}
            style={[styles.formSection, { paddingBottom: insets.bottom + 24 }]}
          >
            <Text style={styles.sectionTitle}>{t('auth.login.title')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.login.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
                placeholderTextColor={Colors.textMuted}
                placeholder={t('auth.login.emailPlaceholder')}
              />
            </View>

            <View style={styles.inputGroupSpaced}>
              <Text style={styles.inputLabel}>{t('auth.login.password')}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
                placeholderTextColor={Colors.textMuted}
                placeholder={t('auth.login.passwordPlaceholder')}
              />
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <Pressable
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? t('auth.login.loading') : t('auth.login.submit')}
              </Text>
            </Pressable>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.login.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={[styles.googleButton, (!isGoogleReady || isLoading) && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={!isGoogleReady || isLoading}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" style={{ marginRight: 12 }} />
              <Text style={styles.googleButtonText}>
                {t('auth.login.google')}
              </Text>
            </Pressable>

            <Link href="/(auth)/register" asChild>
              <Pressable style={styles.switchAuthContainer}>
                <Text style={styles.switchAuthText}>
                  {t('auth.login.noAccount')}{' '}
                  <Text style={styles.switchAuthLink}>{t('auth.login.createAccount')}</Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: Colors.primaryLight,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  heroIllustration: {
    width: 200,
    height: 160,
    marginBottom: Spacing.md,
  },
  brandTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  formSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  inputGroup: {
    marginTop: Spacing.lg,
  },
  inputGroupSpaced: {
    marginTop: Spacing.md,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.xs,
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
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.lg,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: 14,
    marginHorizontal: Spacing.md,
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
  switchAuthContainer: {
    marginTop: Spacing.xl,
  },
  switchAuthText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 15,
  },
  switchAuthLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
