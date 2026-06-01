import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Edit3, Gift, Mail, Phone, Trash2 } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';

type ContactInfoData = {
  phone: string | null;
  email: string | null;
  birthday: { day: number; month: number; year?: number } | null;
};

type ContactInfoSectionProps = {
  contactInfo: ContactInfoData;
  editingField: 'phone' | 'email' | 'birthday' | null;
  onEditField: (field: 'phone' | 'email' | 'birthday' | null) => void;
  onUpdateContactInfo: (updater: (prev: ContactInfoData) => ContactInfoData) => void;
};

function formatBirthdayDisplay(day: number, month: number, monthNames: string[], year?: number): string {
  const monthName = monthNames[month - 1] || month.toString();
  if (year) {
    return `${day} ${monthName} ${year}`;
  }
  return `${day} ${monthName}`;
}

export function ContactInfoSection({
  contactInfo,
  editingField,
  onEditField,
  onUpdateContactInfo,
}: ContactInfoSectionProps) {
  const { t } = useTranslation();

  return (
    <View>
      {contactInfo.phone && (
        <View style={styles.row}>
          {editingField === 'phone' ? (
            <View style={styles.editContainer}>
              <Text style={styles.label}>{t('contact.contactInfoReview.phone')}</Text>
              <TextInput
                style={styles.input}
                value={contactInfo.phone}
                onChangeText={(value) => onUpdateContactInfo((prev) => ({ ...prev, phone: value }))}
                keyboardType="phone-pad"
                autoFocus
              />
              <Pressable style={styles.confirmButton} onPress={() => onEditField(null)}>
                <Text style={styles.confirmButtonText}>OK</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.infoIconTile}>
                <Phone size={18} color={Colors.primary} />
              </View>
              <View style={styles.content}>
                <Text style={styles.label}>{t('contact.contactInfoReview.phone')}</Text>
                <Text style={styles.value}>{contactInfo.phone}</Text>
              </View>
              <View style={styles.iconActions}>
                <Pressable style={styles.iconButton} onPress={() => onEditField('phone')}>
                  <Edit3 size={18} color={Colors.textSecondary} />
                </Pressable>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => onUpdateContactInfo((prev) => ({ ...prev, phone: null }))}
                >
                  <Trash2 size={18} color={Colors.error} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {contactInfo.email && (
        <View style={styles.row}>
          {editingField === 'email' ? (
            <View style={styles.editContainer}>
              <Text style={styles.label}>{t('contact.contactInfoReview.email')}</Text>
              <TextInput
                style={styles.input}
                value={contactInfo.email}
                onChangeText={(value) => onUpdateContactInfo((prev) => ({ ...prev, email: value }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
              <Pressable style={styles.confirmButton} onPress={() => onEditField(null)}>
                <Text style={styles.confirmButtonText}>OK</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.infoIconTile}>
                <Mail size={18} color={Colors.primary} />
              </View>
              <View style={styles.content}>
                <Text style={styles.label}>{t('contact.contactInfoReview.email')}</Text>
                <Text style={styles.value}>{contactInfo.email}</Text>
              </View>
              <View style={styles.iconActions}>
                <Pressable style={styles.iconButton} onPress={() => onEditField('email')}>
                  <Edit3 size={18} color={Colors.textSecondary} />
                </Pressable>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => onUpdateContactInfo((prev) => ({ ...prev, email: null }))}
                >
                  <Trash2 size={18} color={Colors.error} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {contactInfo.birthday && (
        <View style={styles.row}>
          <View style={[styles.infoIconTile, styles.birthdayIconTile]}>
            <Gift size={18} color={Colors.warning} />
          </View>
          <View style={styles.content}>
            <Text style={styles.label}>{t('contact.contactInfoReview.birthday')}</Text>
            <Text style={styles.value}>
              {formatBirthdayDisplay(
                contactInfo.birthday.day,
                contactInfo.birthday.month,
                t('contact.birthdayModal.months', { returnObjects: true }) as string[],
                contactInfo.birthday.year
              )}
            </Text>
          </View>
          <View style={styles.iconActions}>
            <Pressable
              style={styles.iconButton}
              onPress={() => onUpdateContactInfo((prev) => ({ ...prev, birthday: null }))}
            >
              <Trash2 size={18} color={Colors.error} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.hairline,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoIconTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birthdayIconTile: {
    backgroundColor: Colors.amberLight,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  iconActions: {
    flexDirection: 'row',
    gap: 2,
  },
  iconButton: {
    padding: 6,
  },
  editContainer: {
    flex: 1,
  },
  input: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: Colors.textPrimary,
    fontSize: 15,
    marginVertical: 8,
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  confirmButtonText: {
    color: Colors.textInverse,
    fontWeight: '600',
  },
});
