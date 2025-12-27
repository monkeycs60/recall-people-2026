import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, Cake, ChevronDown } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Fact, FactType } from '@/types';
import { Colors } from '@/constants/theme';
import { toast } from 'sonner-native';

type ContactCardProps = {
  facts: Fact[];
  onAddFact: (factType: FactType) => void;
};

type ContactInfo = {
  phone?: string;
  email?: string;
  birthday?: string;
  birthdayFact?: Fact;
};

export function ContactCard({ facts, onAddFact }: ContactCardProps) {
  const { t } = useTranslation();
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false);
  const [emailMenuOpen, setEmailMenuOpen] = useState(false);

  const extractContactInfo = (): ContactInfo => {
    const contactFacts = facts.filter((fact) => fact.factType === 'contact');
    const birthdayFact = facts.find((fact) => fact.factType === 'birthday');

    let phone: string | undefined;
    let email: string | undefined;

    for (const fact of contactFacts) {
      const value = fact.factValue.toLowerCase();
      if (value.includes('@')) {
        email = fact.factValue;
      } else if (/[\d\s+()-]{6,}/.test(fact.factValue)) {
        phone = fact.factValue;
      }
    }

    return {
      phone,
      email,
      birthday: birthdayFact?.factValue,
      birthdayFact,
    };
  };

  const info = extractContactInfo();

  const formatBirthday = (dateString: string): { display: string; countdown?: string } => {
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    let day: number | null = null;
    let month: number | null = null;
    let year: number | null = null;

    const frenchMatch = dateString.match(/(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?/i);
    if (frenchMatch) {
      day = parseInt(frenchMatch[1]);
      const monthName = frenchMatch[2].toLowerCase();
      month = months.findIndex((m) => m.startsWith(monthName));
      year = frenchMatch[3] ? parseInt(frenchMatch[3]) : null;
    }

    const slashMatch = dateString.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (slashMatch) {
      day = parseInt(slashMatch[1]);
      month = parseInt(slashMatch[2]) - 1;
      year = slashMatch[3] ? parseInt(slashMatch[3]) : null;
    }

    const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1]);
      month = parseInt(isoMatch[2]) - 1;
      day = parseInt(isoMatch[3]);
    }

    if (day === null || month === null || month < 0) {
      return { display: dateString };
    }

    const displayDate = `${day} ${months[month]}`;
    let ageStr = '';
    let countdown: string | undefined;

    if (year) {
      const today = new Date();
      const thisYearBirthday = new Date(today.getFullYear(), month, day);
      let age = today.getFullYear() - year;
      if (today < thisYearBirthday) {
        age--;
      }
      ageStr = ` (${t('contact.contactCard.years', { count: age })})`;
    }

    const today = new Date();
    const thisYear = today.getFullYear();
    let nextBirthday = new Date(thisYear, month, day);
    if (nextBirthday < today) {
      nextBirthday = new Date(thisYear + 1, month, day);
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
    if (!info.phone) return;
    const cleanPhone = info.phone.replace(/\s/g, '');

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
        Clipboard.setStringAsync(info.phone);
        toast.success(t('contact.contactCard.copied'));
        break;
    }
    setPhoneMenuOpen(false);
  };

  const handleEmailAction = (action: 'open' | 'copy') => {
    if (!info.email) return;

    switch (action) {
      case 'open':
        Linking.openURL(`mailto:${info.email}`);
        break;
      case 'copy':
        Clipboard.setStringAsync(info.email);
        toast.success(t('contact.contactCard.copied'));
        break;
    }
    setEmailMenuOpen(false);
  };

  const birthdayInfo = info.birthday ? formatBirthday(info.birthday) : null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Phone size={18} color={Colors.primary} />
        {info.phone ? (
          <View style={styles.valueContainer}>
            <Pressable
              style={styles.valueButton}
              onPress={() => setPhoneMenuOpen(!phoneMenuOpen)}
            >
              <Text style={styles.value}>{info.phone}</Text>
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
                <Pressable style={[styles.menuItem, styles.menuItemLast]} onPress={() => handlePhoneAction('copy')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.copy')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={() => onAddFact('contact')}>
            <Text style={styles.addButtonText}>{t('contact.contactCard.addPhone')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.row}>
        <Mail size={18} color={Colors.primary} />
        {info.email ? (
          <View style={styles.valueContainer}>
            <Pressable
              style={styles.valueButton}
              onPress={() => setEmailMenuOpen(!emailMenuOpen)}
            >
              <Text style={styles.value}>{info.email}</Text>
              <ChevronDown size={16} color={Colors.textSecondary} />
            </Pressable>
            {emailMenuOpen && (
              <View style={styles.menu}>
                <Pressable style={styles.menuItem} onPress={() => handleEmailAction('open')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.openMail')}</Text>
                </Pressable>
                <Pressable style={[styles.menuItem, styles.menuItemLast]} onPress={() => handleEmailAction('copy')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.copy')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={() => onAddFact('contact')}>
            <Text style={styles.addButtonText}>{t('contact.contactCard.addEmail')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.row}>
        <Cake size={18} color={Colors.primary} />
        {birthdayInfo ? (
          <View style={styles.birthdayContainer}>
            <Text style={styles.value}>{birthdayInfo.display}</Text>
            {birthdayInfo.countdown && (
              <Text style={styles.countdown}>{birthdayInfo.countdown}</Text>
            )}
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={() => onAddFact('birthday')}>
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
});
