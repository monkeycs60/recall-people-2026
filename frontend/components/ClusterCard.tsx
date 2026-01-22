import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, User } from 'lucide-react-native';
import { Cluster, Contact } from '@/types';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

type ClusterCardProps = {
  cluster: Cluster;
};

export const ClusterCard = ({ cluster }: ClusterCardProps) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleContactPress = (contact: Contact) => {
    router.push(`/contact/${contact.id}`);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggleExpand}
        style={[styles.header, { borderLeftWidth: 4, borderLeftColor: cluster.color }]}
      >
        <View style={styles.headerContent}>
          <View style={[styles.emojiContainer, { backgroundColor: `${cluster.color}20` }]}>
            <Text style={styles.emoji}>{cluster.emoji}</Text>
          </View>
          <View style={styles.labelContainer}>
            <Text style={styles.label} numberOfLines={2}>
              {cluster.label}
            </Text>
            <Text style={styles.contactCount}>
              {cluster.contacts.length} contact{cluster.contacts.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={[styles.chevronContainer, { backgroundColor: `${cluster.color}15` }]}>
          {isExpanded ? (
            <ChevronUp size={18} color={cluster.color} />
          ) : (
            <ChevronDown size={18} color={cluster.color} />
          )}
        </View>
      </Pressable>

      {isExpanded && (
        <View style={styles.contactsSection}>
          <View style={styles.contactsGrid}>
            {cluster.contacts.map((contact) => (
              <Pressable
                key={contact.id}
                onPress={() => handleContactPress(contact)}
                style={styles.contactCard}
              >
                <View style={[styles.contactAvatar, { backgroundColor: `${cluster.color}25` }]}>
                  <User size={18} color={cluster.color} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName} numberOfLines={1}>
                    {contact.firstName}
                  </Text>
                  {contact.lastName && (
                    <Text style={styles.contactLastName} numberOfLines={1}>
                      {contact.lastName}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  emoji: {
    fontSize: 24,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  contactCount: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  contactsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  contactCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 150,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  contactLastName: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
