import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const LOGO = require('@/assets/images/logo.png');

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const { register, loginWithGoogle, isLoading, error, isGoogleReady } = useAuth();
  const insets = useSafeAreaInsets();

  const handleRegister = async () => {
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError(t('auth.register.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      setLocalError(t('auth.register.passwordTooShort'));
      return;
    }

    try {
      await register(email, password, name);
    } catch (registerError) {
      // Error is already handled in useAuth
    }
  };

  const handleGoogleRegister = async () => {
    try {
      await loginWithGoogle();
    } catch (googleError) {
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
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(600)} style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Image
                source={LOGO}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandTitle}>Recall People</Text>
            <Text style={styles.tagline}>{t('auth.register.subtitle')}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.switchAuthTop}>
            <Text style={styles.switchAuthText}>{t('auth.register.hasAccount')}</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable style={styles.switchAuthButton}>
                <Text style={styles.switchAuthButtonText}>{t('auth.register.signIn')}</Text>
              </Pressable>
            </Link>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.register.name')}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isLoading}
                placeholderTextColor={Colors.textMuted}
                placeholder={t('auth.register.namePlaceholder')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.register.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
                placeholderTextColor={Colors.textMuted}
                placeholder={t('auth.register.emailPlaceholder')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.register.password')}</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  placeholderTextColor={Colors.textMuted}
                  placeholder={t('auth.register.passwordPlaceholder')}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={Colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('auth.register.confirmPassword')}</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  editable={!isLoading}
                  placeholderTextColor={Colors.textMuted}
                  placeholder={t('auth.register.confirmPasswordPlaceholder')}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={Colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            {(error || localError) && (
              <Text style={styles.errorText}>{error || localError}</Text>
            )}

            <Pressable
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? t('auth.register.loading') : t('auth.register.submit')}
              </Text>
            </Pressable>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.register.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={[styles.googleButton, (!isGoogleReady || isLoading) && styles.buttonDisabled]}
              onPress={handleGoogleRegister}
              disabled={!isGoogleReady || isLoading}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>{t('auth.register.google')}</Text>
            </Pressable>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 88,
    height: 88,
    marginBottom: 12,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  switchAuthTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
  },
  switchAuthText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  switchAuthButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  switchAuthButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  formSection: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginHorizontal: 16,
  },
  googleButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
