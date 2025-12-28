import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, Cake, ChevronDown } from 'lucide-react-native';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/constants/theme';
import { toast } from 'sonner-native';

type ContactCardProps = {
  phone?: string;
  email?: string;
  birthdayDay?: number;
  birthdayMonth?: number;
  birthdayYear?: number;
  onEditPhone: () => void;
  onEditEmail: () => void;
  onEditBirthday: () => void;
};

export function ContactCard({
  phone,
  email,
  birthdayDay,
  birthdayMonth,
  birthdayYear,
  onEditPhone,
  onEditEmail,
  onEditBirthday,
}: ContactCardProps) {
  const { t } = useTranslation();
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false);
  const [emailMenuOpen, setEmailMenuOpen] = useState(false);

  const months: string[] = t('contact.birthdayModal.months', { returnObjects: true });

  const formatBirthday = (): { display: string; countdown?: string } | null => {
    if (!birthdayDay || !birthdayMonth) return null;

    const displayDate = `${birthdayDay} ${months[birthdayMonth - 1].toLowerCase()}`;
    let ageStr = '';
    let countdown: string | undefined;

    if (birthdayYear) {
      const today = new Date();
      const thisYearBirthday = new Date(today.getFullYear(), birthdayMonth - 1, birthdayDay);
      let age = today.getFullYear() - birthdayYear;
      if (today < thisYearBirthday) {
        age--;
      }
      ageStr = ` (${t('contact.contactCard.years', { count: age })})`;
    }

    const today = new Date();
    const thisYear = today.getFullYear();
    let nextBirthday = new Date(thisYear, birthdayMonth - 1, birthdayDay);
    if (nextBirthday < today) {
      nextBirthday = new Date(thisYear + 1, birthdayMonth - 1, birthdayDay);
    }
    const diffTime = nextBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30 && diffDays > 0) {
      countdown = t('contact.contactCard.inDays', { count: diffDays });
    }

    return {
      display: `${displayDate}${ageStr}`,
      countdown,
    };
  };

  const handlePhoneAction = (action: 'call' | 'whatsapp' | 'sms' | 'copy') => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\s/g, '');

    switch (action) {
      case 'call':
        Linking.openURL(`tel:${cleanPhone}`);
        break;
      case 'whatsapp':
        Linking.openURL(`whatsapp://send?phone=${cleanPhone.replace('+', '')}`);
        break;
      case 'sms':
        Linking.openURL(`sms:${cleanPhone}`);
        break;
      case 'copy':
        Clipboard.setStringAsync(phone);
        toast.success(t('contact.contactCard.copied'));
        break;
    }
    setPhoneMenuOpen(false);
  };

  const handleEmailAction = (action: 'open' | 'copy') => {
    if (!email) return;

    switch (action) {
      case 'open':
        Linking.openURL(`mailto:${email}`);
        break;
      case 'copy':
        Clipboard.setStringAsync(email);
        toast.success(t('contact.contactCard.copied'));
        break;
    }
    setEmailMenuOpen(false);
  };

  const birthdayInfo = formatBirthday();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Phone size={18} color={Colors.primary} />
        {phone ? (
          <View style={styles.valueContainer}>
            <Pressable
              style={styles.valueButton}
              onPress={() => setPhoneMenuOpen(!phoneMenuOpen)}
              onLongPress={onEditPhone}
            >
              <Text style={styles.value}>{phone}</Text>
              <ChevronDown size={16} color={Colors.textSecondary} />
            </Pressable>
            {phoneMenuOpen && (
              <View style={styles.menu}>
                <Pressable style={styles.menuItem} onPress={() => handlePhoneAction('call')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.call')}</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handlePhoneAction('whatsapp')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.whatsapp')}</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handlePhoneAction('sms')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.sms')}</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handlePhoneAction('copy')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.copy')}</Text>
                </Pressable>
                <Pressable style={[styles.menuItem, styles.menuItemLast]} onPress={onEditPhone}>
                  <Text style={styles.menuItemTextEdit}>{t('contact.menu.edit')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={onEditPhone}>
            <Text style={styles.addButtonText}>{t('contact.contactCard.addPhone')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.row}>
        <Mail size={18} color={Colors.primary} />
        {email ? (
          <View style={styles.valueContainer}>
            <Pressable
              style={styles.valueButton}
              onPress={() => setEmailMenuOpen(!emailMenuOpen)}
              onLongPress={onEditEmail}
            >
              <Text style={styles.value}>{email}</Text>
              <ChevronDown size={16} color={Colors.textSecondary} />
            </Pressable>
            {emailMenuOpen && (
              <View style={styles.menu}>
                <Pressable style={styles.menuItem} onPress={() => handleEmailAction('open')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.openMail')}</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handleEmailAction('copy')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.copy')}</Text>
                </Pressable>
                <Pressable style={[styles.menuItem, styles.menuItemLast]} onPress={onEditEmail}>
                  <Text style={styles.menuItemTextEdit}>{t('contact.menu.edit')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={onEditEmail}>
            <Text style={styles.addButtonText}>{t('contact.contactCard.addEmail')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.row}>
        <Cake size={18} color={Colors.primary} />
        {birthdayInfo ? (
          <Pressable style={styles.birthdayContainer} onPress={onEditBirthday}>
            <Text style={styles.value}>{birthdayInfo.display}</Text>
            {birthdayInfo.countdown && (
              <Text style={styles.countdown}>{birthdayInfo.countdown}</Text>
            )}
          </Pressable>
        ) : (
          <Pressable style={styles.addButton} onPress={onEditBirthday}>
            <Text style={styles.addButtonText}>{t('contact.contactCard.addBirthday')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  valueContainer: {
    flex: 1,
  },
  valueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  birthdayContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countdown: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
  },
  addButtonText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  menu: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  menuItemTextEdit: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
});
