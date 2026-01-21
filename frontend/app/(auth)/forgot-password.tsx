import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { requestPasswordReset } from '@/lib/auth';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError(t('auth.forgotPassword.emailRequired'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await requestPasswordReset(email.trim());
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgotPassword.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await requestPasswordReset(email.trim());
    } catch {
      // Silent fail on resend
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(600)} style={styles.successCard}>
            <View style={styles.successIconContainer}>
              <Ionicons name="mail-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.successTitle}>{t('auth.forgotPassword.successTitle')}</Text>
            <Text style={styles.successDescription}>
              {t('auth.forgotPassword.successDescription', { email })}
            </Text>
            <Text style={styles.expiryNote}>
              {t('auth.forgotPassword.expiryNote')}
            </Text>

            <Pressable
              style={[styles.resendButton, isLoading && styles.buttonDisabled]}
              onPress={handleResend}
              disabled={isLoading}
            >
              <Text style={styles.resendButtonText}>
                {isLoading ? t('common.loading') : t('auth.forgotPassword.resend')}
              </Text>
            </Pressable>

            <Link href="/(auth)/login" asChild>
              <Pressable style={styles.backToLoginButton}>
                <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                <Text style={styles.backToLoginText}>{t('auth.forgotPassword.backToLogin')}</Text>
              </Pressable>
            </Link>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

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
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </Pressable>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.title}>{t('auth.forgotPassword.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.forgotPassword.subtitle')}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.formCard}>
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

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <Pressable
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? t('common.loading') : t('auth.forgotPassword.submit')}
              </Text>
            </Pressable>
          </Animated.View>

          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.switchAuthContainer}>
              <Text style={styles.switchAuthText}>
                {t('auth.forgotPassword.rememberPassword')}{' '}
                <Text style={styles.switchAuthLink}>{t('auth.register.signIn')}</Text>
              </Text>
            </Pressable>
          </Link>
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
    paddingHorizontal: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
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
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
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
  switchAuthContainer: {
    marginTop: 24,
    paddingVertical: 8,
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
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginTop: 40,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  successDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  expiryNote: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  resendButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  resendButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  backToLoginText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
