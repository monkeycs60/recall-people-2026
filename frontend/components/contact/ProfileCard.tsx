import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fact, FactType } from '@/types';
import { Colors } from '@/constants/theme';

type ProfileCardProps = {
  facts: Fact[];
  onEditFact: (fact: Fact) => void;
  onDeleteFact: (fact: Fact) => void;
  highlightId?: string;
};

const FACT_TYPE_CONFIG: Record<FactType, { priority: number; singular: boolean }> = {
  work: { priority: 1, singular: true },
  company: { priority: 2, singular: true },
  education: { priority: 3, singular: true },
  location: { priority: 4, singular: true },
  origin: { priority: 5, singular: true },
  partner: { priority: 6, singular: true },
  children: { priority: 7, singular: false },
  hobby: { priority: 8, singular: false },
  sport: { priority: 9, singular: false },
  language: { priority: 10, singular: false },
  pet: { priority: 11, singular: false },
  birthday: { priority: 12, singular: true },
  how_met: { priority: 13, singular: true },
  where_met: { priority: 14, singular: true },
  shared_ref: { priority: 15, singular: false },
  trait: { priority: 16, singular: false },
  gift_idea: { priority: 17, singular: false },
  gift_given: { priority: 18, singular: false },
  contact: { priority: 19, singular: false },
  relationship: { priority: 20, singular: false },
  other: { priority: 99, singular: false },
};

type GroupedFacts = {
  type: FactType;
  config: { priority: number; singular: boolean };
  facts: Fact[];
};

export function ProfileCard({ facts, onEditFact, onDeleteFact, highlightId }: ProfileCardProps) {
  const { t } = useTranslation();
  const [expandedType, setExpandedType] = useState<FactType | null>(null);

  const getFactTypeLabel = (factType: FactType): string => {
    return t(`contact.factTypes.${factType}`);
  };

  // Filtrer les facts avec des valeurs vides puis grouper par type
  const validFacts = facts.filter((fact) => fact.factValue && fact.factValue.trim() !== '');

  const groupedByType = validFacts.reduce<Record<FactType, Fact[]>>((acc, fact) => {
    if (!acc[fact.factType]) {
      acc[fact.factType] = [];
    }
    acc[fact.factType].push(fact);
    return acc;
  }, {} as Record<FactType, Fact[]>);

  // Convertir en array et trier par priorité
  const groups: GroupedFacts[] = Object.entries(groupedByType)
    .map(([type, typeFacts]) => ({
      type: type as FactType,
      config: FACT_TYPE_CONFIG[type as FactType] || FACT_TYPE_CONFIG.other,
      facts: typeFacts,
    }))
    .sort((groupA, groupB) => groupA.config.priority - groupB.config.priority);

  const primaryGroups = groups.filter((group) => ['work', 'company'].includes(group.type));
  const secondaryGroups = groups.filter((group) => !['work', 'company'].includes(group.type));

  const renderSingularFact = (fact: Fact) => {
    const config = FACT_TYPE_CONFIG[fact.factType] || FACT_TYPE_CONFIG.other;
    const isExpanded = expandedType === fact.factType;
    const isHighlighted = highlightId === fact.id;

    return (
      <View
        key={fact.id}
        style={[
          styles.factCard,
          isHighlighted && styles.factCardHighlighted,
        ]}
      >
        <Pressable
          style={styles.factContent}
          onPress={() => onEditFact(fact)}
        >
          <View style={styles.factTextContainer}>
            <Text style={styles.factValue}>{fact.factValue}</Text>
            <Text style={styles.factType}>{getFactTypeLabel(fact.factType)}</Text>
            {fact.previousValues.length > 0 && (
              <Pressable
                style={styles.previousValuesToggle}
                onPress={() => setExpandedType(isExpanded ? null : fact.factType)}
              >
                <Text style={styles.previousValuesText}>
                  {t('contact.fact.previousCount', { count: fact.previousValues.length })}
                </Text>
                {isExpanded ? (
                  <ChevronUp size={12} color={Colors.textMuted} />
                ) : (
                  <ChevronDown size={12} color={Colors.textMuted} />
                )}
              </Pressable>
            )}
          </View>
          <Pressable style={styles.deleteButton} onPress={() => onDeleteFact(fact)}>
            <Trash2 size={16} color={Colors.error} />
          </Pressable>
        </Pressable>

        {isExpanded && fact.previousValues.length > 0 && (
          <View style={styles.previousValuesContainer}>
            {fact.previousValues.map((prevValue, idx) => (
              <View key={idx} style={styles.previousValueRow}>
                <View style={styles.previousValueDot} />
                <Text style={styles.previousValue}>{prevValue}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderCumulativeGroup = (group: GroupedFacts) => {
    const hasHighlightedFact = group.facts.some((fact) => fact.id === highlightId);
    const isExpanded = expandedType === group.type || hasHighlightedFact;
    const values = group.facts.map((fact) => fact.factValue);

    return (
      <View
        key={group.type}
        style={[
          styles.factCard,
          hasHighlightedFact && styles.factCardHighlighted,
        ]}
      >
        <View style={styles.groupHeader}>
          <View style={styles.factTextContainer}>
            <Text style={styles.factValue}>{values.join(', ')}</Text>
            <Pressable
              style={styles.previousValuesToggle}
              onPress={() => setExpandedType(isExpanded ? null : group.type)}
            >
              <Text style={styles.factType}>
                {getFactTypeLabel(group.type)} ({group.facts.length})
              </Text>
              {isExpanded ? (
                <ChevronUp size={12} color={Colors.textMuted} />
              ) : (
                <ChevronDown size={12} color={Colors.textMuted} />
              )}
            </Pressable>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedList}>
            {group.facts.map((fact) => (
              <View
                key={fact.id}
                style={[
                  styles.expandedItem,
                  fact.id === highlightId && styles.expandedItemHighlighted,
                ]}
              >
                <View style={styles.expandedItemContent}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Pressable onPress={() => onEditFact(fact)} style={styles.factTextContainer}>
                    <Text style={styles.expandedItemText}>{fact.factValue}</Text>
                  </Pressable>
                </View>
                <Pressable style={styles.deleteButton} onPress={() => onDeleteFact(fact)}>
                  <Trash2 size={14} color={Colors.error} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderGroup = (group: GroupedFacts) => {
    if (group.config.singular) {
      return renderSingularFact(group.facts[0]);
    } else {
      return renderCumulativeGroup(group);
    }
  };

  if (validFacts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>{t('contact.fact.emptyState')}</Text>
      </View>
    );
  }

  return (
    <View>
      {primaryGroups.map((group) => renderGroup(group))}
      {secondaryGroups.map((group) => renderGroup(group))}
    </View>
  );
}

const styles = StyleSheet.create({
  factCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  factCardHighlighted: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  factContent: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  factTextContainer: {
    flex: 1,
  },
  factValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  factType: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previousValuesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  previousValuesText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginRight: 4,
  },
  deleteButton: {
    padding: 4,
  },
  previousValuesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  previousValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  previousValueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
    marginRight: 8,
  },
  previousValue: {
    fontSize: 13,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  groupHeader: {
    padding: 12,
  },
  expandedList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 8,
  },
  expandedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  expandedItemHighlighted: {
    backgroundColor: `${Colors.primary}20`,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  expandedItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bulletPoint: {
    color: Colors.primary,
    marginRight: 8,
    fontSize: 16,
  },
  expandedItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  emptyState: {
    backgroundColor: `${Colors.surface}50`,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
