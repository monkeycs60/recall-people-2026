import { View, Text, StyleSheet } from 'react-native';
import { BaseToast, ErrorToast, ToastConfig as ToastConfigType } from 'react-native-toast-message';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { AlertCircle, CheckCircle, Info } from 'lucide-react-native';

export const toastConfig: ToastConfigType = {
  success: (props) => (
    <View style={[styles.container, styles.successContainer]}>
      <CheckCircle size={20} color={Colors.success} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{props.text1}</Text>
        {props.text2 && <Text style={styles.subtitle}>{props.text2}</Text>}
      </View>
    </View>
  ),
  error: (props) => (
    <View style={[styles.container, styles.errorContainer]}>
      <AlertCircle size={20} color={Colors.error} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{props.text1}</Text>
        {props.text2 && <Text style={styles.subtitle}>{props.text2}</Text>}
      </View>
    </View>
  ),
  info: (props) => (
    <View style={[styles.container, styles.infoContainer]}>
      <Info size={20} color={Colors.info} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{props.text1}</Text>
        {props.text2 && <Text style={styles.subtitle}>{props.text2}</Text>}
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  successContainer: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  errorContainer: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  infoContainer: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
