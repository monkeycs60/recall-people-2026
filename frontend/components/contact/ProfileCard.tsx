import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Fact, FactType } from '@/types';

type ProfileCardProps = {
  facts: Fact[];
  onEditFact: (fact: Fact) => void;
  onDeleteFact: (fact: Fact) => void;
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

export function ProfileCard({ facts, onEditFact, onDeleteFact }: ProfileCardProps) {
  const [expandedFactId, setExpandedFactId] = useState<string | null>(null);

  const sortedFacts = [...facts].sort((factA, factB) => {
    const configA = FACT_TYPE_CONFIG[factA.factType] || FACT_TYPE_CONFIG.other;
    const configB = FACT_TYPE_CONFIG[factB.factType] || FACT_TYPE_CONFIG.other;
    return configA.priority - configB.priority;
  });

  const primaryFacts = sortedFacts.filter(
    (fact) => ['work', 'company'].includes(fact.factType)
  );
  const secondaryFacts = sortedFacts.filter(
    (fact) => !['work', 'company'].includes(fact.factType)
  );

  const renderFact = (fact: Fact, isPrimary = false) => {
    const config = FACT_TYPE_CONFIG[fact.factType] || FACT_TYPE_CONFIG.other;
    const isExpanded = expandedFactId === fact.id;

    return (
      <View
        key={fact.id}
        className={`bg-surface rounded-lg overflow-hidden ${isPrimary ? 'flex-1' : 'mb-2'}`}
      >
        <Pressable
          className="p-3 flex-row items-start justify-between"
          onPress={() => onEditFact(fact)}
        >
          <View className="flex-1">
            <Text className={`text-textPrimary ${isPrimary ? 'font-semibold text-lg' : 'font-medium'}`}>
              {fact.factValue}
            </Text>
            <Text className="text-textSecondary text-xs mt-0.5">{fact.factKey}</Text>
            {fact.previousValues.length > 0 && (
              <Pressable
                className="flex-row items-center mt-1"
                onPress={() => setExpandedFactId(isExpanded ? null : fact.id)}
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

  if (facts.length === 0) {
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
      {primaryFacts.length > 0 && (
        <View className="flex-row gap-2 mb-3">
          {primaryFacts.map((fact) => renderFact(fact, true))}
        </View>
      )}
      {secondaryFacts.map((fact) => renderFact(fact, false))}
    </View>
  );
}
