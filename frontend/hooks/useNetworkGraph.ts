import { useState, useCallback } from 'react';
import { useContactsStore } from '@/stores/contacts-store';
import { similarityService } from '@/services/similarity.service';
import { Contact, ContactWithDetails, FactType, Cluster, ClusterData } from '@/types';
import { contactService } from '@/services/contact.service';

const SIMILARITY_THRESHOLD = 0.85;

const FACT_TYPE_CONFIG: Record<FactType, { color: string; emoji: string; prefix: string }> = {
  sport: { color: '#ef4444', emoji: '🎾', prefix: 'Pratiquent' },
  hobby: { color: '#10b981', emoji: '🎨', prefix: 'Passionnés de' },
  work: { color: '#f59e0b', emoji: '💼', prefix: 'Métier :' },
  company: { color: '#3b82f6', emoji: '🏢', prefix: 'Travaillent chez' },
  location: { color: '#8b5cf6', emoji: '📍', prefix: 'Habitent à' },
  education: { color: '#06b6d4', emoji: '🎓', prefix: 'Ont étudié à' },
  relationship: { color: '#ec4899', emoji: '👨‍👩‍👧', prefix: 'Relation :' },
  partner: { color: '#ec4899', emoji: '💑', prefix: 'Conjoint :' },
  birthday: { color: '#f97316', emoji: '🎂', prefix: 'Anniversaire' },
  contact: { color: '#64748b', emoji: '📞', prefix: 'Contact' },
  origin: { color: '#10b981', emoji: '🌍', prefix: 'Origine :' },
  children: { color: '#f59e0b', emoji: '👶', prefix: 'Enfants :' },
  language: { color: '#3b82f6', emoji: '🗣️', prefix: 'Parlent' },
  pet: { color: '#8b5cf6', emoji: '🐾', prefix: 'Animaux :' },
  how_met: { color: '#06b6d4', emoji: '🤝', prefix: 'Rencontrés via' },
  where_met: { color: '#ec4899', emoji: '📍', prefix: 'Rencontrés à' },
  shared_ref: { color: '#f97316', emoji: '💬', prefix: 'Référence :' },
  trait: { color: '#64748b', emoji: '✨', prefix: 'Trait :' },
  gift_idea: { color: '#10b981', emoji: '🎁', prefix: 'Idée cadeau :' },
  gift_given: { color: '#ef4444', emoji: '🎁', prefix: 'Cadeau offert :' },
  other: { color: '#6b7280', emoji: '📌', prefix: '' },
};

type UseNetworkGraphResult = {
  clusterData: ClusterData | null;
  isLoading: boolean;
  isCalculating: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  forceRefresh: () => Promise<void>;
};

export const useNetworkGraph = (): UseNetworkGraphResult => {
  const { contacts, loadContacts } = useContactsStore();
  const [clusterData, setClusterData] = useState<ClusterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildClusters = useCallback(async (forceRecalculate = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const contactsWithFacts: ContactWithDetails[] = [];
      for (const contact of contacts) {
        const details = await contactService.getById(contact.id);
        if (details) {
          contactsWithFacts.push(details);
        }
      }

      const allFacts = contactsWithFacts.flatMap((contact) =>
        contact.facts.map((fact) => ({
          contactId: contact.id,
          factType: fact.factType,
          factValue: fact.factValue,
        }))
      );

      if (allFacts.length === 0) {
        setClusterData({
          clusters: [],
          unconnected: contactsWithFacts,
        });
        setIsLoading(false);
        return;
      }

      setIsCalculating(true);
      const similarities = forceRecalculate
        ? await similarityService.forceRecalculate(allFacts)
        : await similarityService.calculateSimilarities(allFacts);
      setIsCalculating(false);

      const factGroups = new Map<string, {
        factType: FactType;
        primaryValue: string;
        allValues: Set<string>;
        contactIds: Set<string>;
      }>();

      for (const contactWithFacts of contactsWithFacts) {
        for (const fact of contactWithFacts.facts) {
          const normalizedValue = fact.factValue.toLowerCase().trim();
          let foundGroup = false;

          for (const [groupKey, group] of factGroups.entries()) {
            if (group.factType !== fact.factType) continue;

            if (group.allValues.has(normalizedValue)) {
              group.contactIds.add(contactWithFacts.id);
              foundGroup = true;
              break;
            }

            for (const existingValue of group.allValues) {
              const similarity = similarities.find(
                (sim) =>
                  sim.factType === fact.factType &&
                  ((sim.factValue1.toLowerCase() === normalizedValue &&
                    sim.factValue2.toLowerCase() === existingValue) ||
                    (sim.factValue1.toLowerCase() === existingValue &&
                      sim.factValue2.toLowerCase() === normalizedValue))
              );

              if (similarity && similarity.score >= SIMILARITY_THRESHOLD) {
                group.allValues.add(normalizedValue);
                group.contactIds.add(contactWithFacts.id);
                foundGroup = true;
                break;
              }
            }

            if (foundGroup) break;
          }

          if (!foundGroup) {
            const groupKey = `${fact.factType}:${normalizedValue}`;
            factGroups.set(groupKey, {
              factType: fact.factType,
              primaryValue: fact.factValue,
              allValues: new Set([normalizedValue]),
              contactIds: new Set([contactWithFacts.id]),
            });
          }
        }
      }

      const contactsMap = new Map<string, Contact>();
      for (const contactWithDetails of contactsWithFacts) {
        contactsMap.set(contactWithDetails.id, contactWithDetails);
      }

      const clusters: Cluster[] = [];
      const connectedContactIds = new Set<string>();

      for (const [groupKey, group] of factGroups.entries()) {
        if (group.contactIds.size >= 2) {
          const clusterContacts: Contact[] = [];
          for (const contactId of group.contactIds) {
            const contact = contactsMap.get(contactId);
            if (contact) {
              clusterContacts.push(contact);
              connectedContactIds.add(contactId);
            }
          }

          const config = FACT_TYPE_CONFIG[group.factType];
          const label = config.prefix
            ? `${config.prefix} ${group.primaryValue}`
            : group.primaryValue;
          clusters.push({
            id: groupKey,
            factType: group.factType,
            label,
            contacts: clusterContacts,
            color: config.color,
            emoji: config.emoji,
          });
        }
      }

      clusters.sort((clusterA, clusterB) => clusterB.contacts.length - clusterA.contacts.length);

      const unconnected = contactsWithFacts.filter((contact) => !connectedContactIds.has(contact.id));

      setClusterData({
        clusters,
        unconnected,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du calcul des clusters');
    } finally {
      setIsLoading(false);
      setIsCalculating(false);
    }
  }, [contacts]);

  const refresh = useCallback(async () => {
    await loadContacts();
    await buildClusters(false);
  }, [loadContacts, buildClusters]);

  const forceRefresh = useCallback(async () => {
    await loadContacts();
    await buildClusters(true);
  }, [loadContacts, buildClusters]);

  return {
    clusterData,
    isLoading,
    isCalculating,
    error,
    refresh,
    forceRefresh,
  };
};
