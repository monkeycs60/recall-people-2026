import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Sparkles, Trash2, X, Lock } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { uploadUserAvatar, generateUserAvatar, deleteUserAvatar, useAvatarTrial } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { setUser } from '@/lib/auth';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { Paywall } from '@/components/Paywall';

type UserAvatarEditModalProps = {
  visible: boolean;
  currentAvatarUrl?: string;
  onSave: (avatarUrl: string | null) => void;
  onClose: () => void;
};

type ModeType = 'choose' | 'generate';

export function UserAvatarEditModal({
  visible,
  currentAvatarUrl,
  onSave,
  onClose,
}: UserAvatarEditModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ModeType>('choose');
  const [prompt, setPrompt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const updateUser = useAuthStore((state) => state.updateUser);
  const user = useAuthStore((state) => state.user);

  const canGenerateAvatar = useSubscriptionStore((state) => state.canGenerateAvatar);
  const freeAvatarTrials = useSubscriptionStore((state) => state.freeAvatarTrials);
  const setFreeAvatarTrials = useSubscriptionStore((state) => state.setFreeAvatarTrials);
  const isPremium = useSubscriptionStore((state) => state.isPremium);

  const resetState = () => {
    setMode('choose');
    setPrompt('');
    setPreviewUrl(null);
    setIsUploading(false);
    setIsGenerating(false);
    setShowPaywall(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGeneratePress = () => {
    if (!canGenerateAvatar()) {
      setShowPaywall(true);
      return;
    }
    setMode('generate');
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(t('common.error'), t('profile.avatar.permissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      exif: false,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setPreviewUrl(asset.uri);

    setIsUploading(true);
    try {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (!fileInfo.exists) {
        throw new Error('File not found');
      }

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const mimeType =
        asset.mimeType === 'image/png'
          ? 'image/png'
          : asset.mimeType === 'image/webp'
            ? 'image/webp'
            : 'image/jpeg';

      const response = await uploadUserAvatar({
        imageBase64: base64,
        mimeType: mimeType as 'image/png' | 'image/jpeg' | 'image/webp',
      });

      updateUser({ avatarUrl: response.avatarUrl });
      if (user) {
        await setUser({ ...user, avatarUrl: response.avatarUrl });
      }
      onSave(response.avatarUrl);
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(t('common.error'), t('profile.avatar.uploadError'));
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert(t('common.error'), t('contact.avatar.promptRequired'));
      return;
    }

    if (!canGenerateAvatar()) {
      setShowPaywall(true);
      return;
    }

    setIsGenerating(true);
    try {
      // Decrement trial before generating
      const trialResult = await useAvatarTrial();
      if (!trialResult.success && trialResult.error === 'no_trials_left') {
        setShowPaywall(true);
        setIsGenerating(false);
        return;
      }

      // Update local state with remaining trials
      if (trialResult.remaining >= 0) {
        setFreeAvatarTrials(trialResult.remaining);
      }

      const response = await generateUserAvatar({
        prompt: prompt.trim(),
      });

      setPreviewUrl(response.avatarUrl);
      updateUser({ avatarUrl: response.avatarUrl });
      if (user) {
        await setUser({ ...user, avatarUrl: response.avatarUrl });
      }
      onSave(response.avatarUrl);
      handleClose();
    } catch (error) {
      console.error('Generate error:', error);
      Alert.alert(t('common.error'), t('contact.avatar.generateError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    setIsUploading(true);
    try {
      await deleteUserAvatar();
      updateUser({ avatarUrl: undefined });
      if (user) {
        const { avatarUrl: _, ...userWithoutAvatar } = user;
        await setUser(userWithoutAvatar as typeof user);
      }
      onSave(null);
      handleClose();
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert(t('common.error'), t('profile.avatar.deleteError'));
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = isUploading || isGenerating;

  if (showPaywall) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={() => setShowPaywall(false)}>
        <Paywall onClose={() => setShowPaywall(false)} reason="avatar_generation" />
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('profile.avatar.title')}</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {previewUrl && (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: previewUrl }}
                style={styles.previewImage}
                contentFit="cover"
              />
            </View>
          )}

          {mode === 'choose' && !isLoading && (
            <View style={styles.optionsContainer}>
              <Pressable style={styles.optionButton} onPress={handlePickImage}>
                <View style={styles.optionIconContainer}>
                  <ImageIcon size={24} color={Colors.primary} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>{t('profile.avatar.fromGallery')}</Text>
                  <Text style={styles.optionDescription}>
                    {t('profile.avatar.fromGalleryDescription')}
                  </Text>
                </View>
              </Pressable>

              <Pressable style={styles.optionButton} onPress={handleGeneratePress}>
                <View style={[styles.optionIconContainer, styles.optionIconGenerate]}>
                  {canGenerateAvatar() ? (
                    <Sparkles size={24} color={Colors.primary} />
                  ) : (
                    <Lock size={24} color={Colors.textMuted} />
                  )}
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>{t('contact.avatar.generateWithAI')}</Text>
                  <Text style={styles.optionDescription}>
                    {canGenerateAvatar()
                      ? isPremium
                        ? t('contact.avatar.generateWithAIDescription')
                        : t('contact.avatar.trialsRemaining', { count: freeAvatarTrials })
                      : t('contact.avatar.noTrialsLeft')}
                  </Text>
                </View>
              </Pressable>

              {currentAvatarUrl && (
                <Pressable style={styles.deleteOption} onPress={handleDelete}>
                  <Trash2 size={20} color={Colors.error} />
                  <Text style={styles.deleteText}>{t('profile.avatar.removeAvatar')}</Text>
                </Pressable>
              )}
            </View>
          )}

          {mode === 'generate' && !isLoading && (
            <ScrollView style={styles.generateContainer} keyboardShouldPersistTaps="handled">
              <Text style={styles.generateLabel}>{t('contact.avatar.describeAppearance')}</Text>
              <Text style={styles.generateHint}>
                {t('profile.avatar.describeHint')}
              </Text>
              <TextInput
                style={styles.promptInput}
                value={prompt}
                onChangeText={setPrompt}
                placeholder={t('contact.avatar.promptPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.generateButtonRow}>
                <Pressable style={styles.backButton} onPress={() => setMode('choose')}>
                  <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.generateButton, !prompt.trim() && styles.generateButtonDisabled]}
                  onPress={handleGenerate}
                  disabled={!prompt.trim()}
                >
                  <Sparkles size={18} color={Colors.textInverse} />
                  <Text style={styles.generateButtonText}>{t('contact.avatar.generate')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>
                {isUploading ? t('profile.avatar.uploading') : t('contact.avatar.generating')}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconGenerate: {
    backgroundColor: Colors.primaryLight,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  deleteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  deleteText: {
    fontSize: 15,
    color: Colors.error,
    fontWeight: '500',
  },
  generateContainer: {
    maxHeight: 400,
  },
  generateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  generateHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  promptInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    minHeight: 100,
    marginBottom: Spacing.lg,
  },
  generateButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  backButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  generateButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  generateButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  generateButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
