import { View, Text, StyleSheet } from 'react-native';
import { ToastConfig as ToastConfigType } from 'react-native-toast-message';
import { Colors, Spacing } from '@/constants/theme';
import { AlertCircle, CheckCircle, Info } from 'lucide-react-native';

export const toastConfig: ToastConfigType = {
  success: (props) => (
    <View style={[styles.container, styles.successContainer]}>
      <CheckCircle size={20} color={Colors.textPrimary} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{props.text1}</Text>
        {props.text2 && <Text style={styles.subtitle}>{props.text2}</Text>}
      </View>
    </View>
  ),
  error: (props) => (
    <View style={[styles.container, styles.errorContainer]}>
      <AlertCircle size={20} color={Colors.textPrimary} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{props.text1}</Text>
        {props.text2 && <Text style={styles.subtitle}>{props.text2}</Text>}
      </View>
    </View>
  ),
  info: (props) => (
    <View style={[styles.container, styles.infoContainer]}>
      <Info size={20} color={Colors.textPrimary} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{props.text1}</Text>
        {props.text2 && <Text style={styles.subtitle}>{props.text2}</Text>}
      </View>
    </View>
  ),
  warning: (props) => (
    <View style={[styles.container, styles.warningContainer]}>
      <AlertCircle size={20} color={Colors.textPrimary} />
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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  successContainer: {
    backgroundColor: Colors.menthe,
  },
  errorContainer: {
    backgroundColor: '#FFD4D0',
  },
  infoContainer: {
    backgroundColor: Colors.rose,
  },
  warningContainer: {
    backgroundColor: Colors.peche,
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
    color: Colors.textPrimary,
    opacity: 0.8,
    marginTop: 2,
  },
});
