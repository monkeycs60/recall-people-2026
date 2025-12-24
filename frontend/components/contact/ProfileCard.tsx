import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Fact, FactType } from '@/types';

type ProfileCardProps = {
  facts: Fact[];
  onEditFact: (fact: Fact) => void;
  onDeleteFact: (fact: Fact) => void;
  highlightId?: string;
};

const FACT_TYPE_CONFIG: Record<FactType, { label: string; priority: number; singular: boolean }> = {
  work: { label: 'Métier', priority: 1, singular: true },
  company: { label: 'Entreprise', priority: 2, singular: true },
  education: { label: 'Formation', priority: 3, singular: true },
  location: { label: 'Ville', priority: 4, singular: true },
  origin: { label: 'Origine', priority: 5, singular: true },
  partner: { label: 'Conjoint', priority: 6, singular: true },
  children: { label: 'Enfants', priority: 7, singular: false },
  hobby: { label: 'Loisirs', priority: 8, singular: false },
  sport: { label: 'Sports', priority: 9, singular: false },
  language: { label: 'Langues', priority: 10, singular: false },
  pet: { label: 'Animaux', priority: 11, singular: false },
  birthday: { label: 'Anniversaire', priority: 12, singular: true },
  how_met: { label: 'Rencontre', priority: 13, singular: true },
  where_met: { label: 'Lieu rencontre', priority: 14, singular: true },
  shared_ref: { label: 'Références', priority: 15, singular: false },
  trait: { label: 'Traits', priority: 16, singular: false },
  gift_idea: { label: 'Idées cadeaux', priority: 17, singular: false },
  gift_given: { label: 'Cadeaux faits', priority: 18, singular: false },
  contact: { label: 'Contact', priority: 19, singular: false },
  relationship: { label: 'Relations', priority: 20, singular: false },
  other: { label: 'Autre', priority: 99, singular: false },
};

type GroupedFacts = {
  type: FactType;
  config: { label: string; priority: number; singular: boolean };
  facts: Fact[];
};

export function ProfileCard({ facts, onEditFact, onDeleteFact, highlightId }: ProfileCardProps) {
  const [expandedType, setExpandedType] = useState<FactType | null>(null);

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
        className="rounded-lg overflow-hidden mb-2"
        style={{
          backgroundColor: isHighlighted ? '#8b5cf620' : '#18181b',
          borderWidth: isHighlighted ? 2 : 0,
          borderColor: isHighlighted ? '#8b5cf6' : 'transparent',
        }}
      >
        <Pressable
          className="p-3 flex-row items-start justify-between"
          onPress={() => onEditFact(fact)}
        >
          <View className="flex-1">
            <Text className="text-textPrimary font-medium">
              {fact.factValue}
            </Text>
            <Text className="text-textSecondary text-xs mt-0.5">{config.label}</Text>
            {fact.previousValues.length > 0 && (
              <Pressable
                className="flex-row items-center mt-1"
                onPress={() => setExpandedType(isExpanded ? null : fact.factType)}
              >
                <Text className="text-textMuted text-xs mr-1">
                  {fact.previousValues.length} ancien{fact.previousValues.length > 1 ? 's' : ''}
                </Text>
                {isExpanded ? (
                  <ChevronUp size={12} color="#71717a" />
                ) : (
                  <ChevronDown size={12} color="#71717a" />
                )}
              </Pressable>
            )}
          </View>
          <Pressable className="p-1" onPress={() => onDeleteFact(fact)}>
            <Trash2 size={16} color="#EF4444" />
          </Pressable>
        </Pressable>

        {isExpanded && fact.previousValues.length > 0 && (
          <View className="px-3 pb-3">
            {fact.previousValues.map((prevValue, idx) => (
              <View key={idx} className="flex-row items-center mt-1">
                <View className="w-1.5 h-1.5 rounded-full bg-textMuted mr-2" />
                <Text className="text-textMuted text-sm line-through">{prevValue}</Text>
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
        className="rounded-lg overflow-hidden mb-2"
        style={{
          backgroundColor: hasHighlightedFact ? '#8b5cf620' : '#18181b',
          borderWidth: hasHighlightedFact ? 2 : 0,
          borderColor: hasHighlightedFact ? '#8b5cf6' : 'transparent',
        }}
      >
        <View className="p-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-textPrimary font-medium">
                {values.join(', ')}
              </Text>
              <Pressable
                className="flex-row items-center mt-1"
                onPress={() => setExpandedType(isExpanded ? null : group.type)}
              >
                <Text className="text-textSecondary text-xs mr-1">
                  {group.config.label} ({group.facts.length})
                </Text>
                {isExpanded ? (
                  <ChevronUp size={12} color="#71717a" />
                ) : (
                  <ChevronDown size={12} color="#71717a" />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {isExpanded && (
          <View className="px-3 pb-3 border-t border-surfaceHover pt-2">
            {group.facts.map((fact) => (
              <View
                key={fact.id}
                className="flex-row items-center justify-between py-1.5"
                style={{
                  backgroundColor: fact.id === highlightId ? '#8b5cf630' : 'transparent',
                  borderRadius: 8,
                  paddingHorizontal: fact.id === highlightId ? 8 : 0,
                }}
              >
                <View className="flex-row items-center flex-1">
                  <Text className="text-primary mr-2">•</Text>
                  <Pressable onPress={() => onEditFact(fact)} className="flex-1">
                    <Text className="text-textPrimary">{fact.factValue}</Text>
                  </Pressable>
                </View>
                <Pressable className="p-1" onPress={() => onDeleteFact(fact)}>
                  <Trash2 size={14} color="#EF4444" />
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
      <View className="bg-surface/30 p-4 rounded-lg border border-dashed border-surfaceHover">
        <Text className="text-textMuted text-center">
          Aucune information de profil
        </Text>
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
