import { useState, useEffect, useCallback, useRef } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3-force';
import { useContactsStore } from '@/stores/contacts-store';
import { similarityService } from '@/services/similarity.service';
import { Contact, ContactWithDetails, FactType, GraphNode, GraphEdge, NetworkData } from '@/types';
import { contactService } from '@/services/contact.service';

const SIMILARITY_THRESHOLD = 0.6;
const GRAPH_WIDTH = 350;
const GRAPH_HEIGHT = 400;

type SimNode = SimulationNodeDatum & {
  id: string;
  contactId: string;
  label: string;
};

type SimLink = SimulationLinkDatum<SimNode> & {
  id: string;
  factType: FactType;
  label: string;
  similarity: number;
};

type UseNetworkGraphResult = {
  networkData: NetworkData | null;
  isLoading: boolean;
  isCalculating: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  forceRefresh: () => Promise<void>;
};

export const useNetworkGraph = (): UseNetworkGraphResult => {
  const { contacts, loadContacts } = useContactsStore();
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);

  const buildGraph = useCallback(async (forceRecalculate = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all contacts with their facts
      const contactsWithFacts: ContactWithDetails[] = [];
      for (const contact of contacts) {
        const details = await contactService.getById(contact.id);
        if (details) {
          contactsWithFacts.push(details);
        }
      }

      // Collect all facts
      const allFacts = contactsWithFacts.flatMap((contact) =>
        contact.facts.map((fact) => ({
          contactId: contact.id,
          factType: fact.factType,
          factValue: fact.factValue,
        }))
      );

      if (allFacts.length === 0) {
        setNetworkData({
          nodes: [],
          edges: [],
          unconnected: contacts,
        });
        setIsLoading(false);
        return;
      }

      // Calculate similarities
      setIsCalculating(true);
      const similarities = forceRecalculate
        ? await similarityService.forceRecalculate(allFacts)
        : await similarityService.calculateSimilarities(allFacts);
      setIsCalculating(false);

      // Build edges from similarities
      const edges: GraphEdge[] = [];
      const connectedContactIds = new Set<string>();

      // Group facts by contact for quick lookup
      const factsByContact = new Map<string, Array<{ factType: FactType; factValue: string }>>();
      for (const fact of allFacts) {
        if (!factsByContact.has(fact.contactId)) {
          factsByContact.set(fact.contactId, []);
        }
        factsByContact.get(fact.contactId)!.push({
          factType: fact.factType,
          factValue: fact.factValue,
        });
      }

      // Find connections between contacts
      const contactIds = Array.from(factsByContact.keys());
      for (let firstIdx = 0; firstIdx < contactIds.length; firstIdx++) {
        for (let secondIdx = firstIdx + 1; secondIdx < contactIds.length; secondIdx++) {
          const contact1Id = contactIds[firstIdx];
          const contact2Id = contactIds[secondIdx];
          const facts1 = factsByContact.get(contact1Id)!;
          const facts2 = factsByContact.get(contact2Id)!;

          // Check for matching facts
          for (const fact1 of facts1) {
            for (const fact2 of facts2) {
              if (fact1.factType !== fact2.factType) continue;

              // Exact match
              if (fact1.factValue.toLowerCase() === fact2.factValue.toLowerCase()) {
                edges.push({
                  id: `${contact1Id}-${contact2Id}-${fact1.factType}`,
                  source: contact1Id,
                  target: contact2Id,
                  factType: fact1.factType,
                  label: fact1.factValue,
                  similarity: 1.0,
                });
                connectedContactIds.add(contact1Id);
                connectedContactIds.add(contact2Id);
              } else {
                // Check similarity score
                const similarity = similarities.find(
                  (s) =>
                    s.factType === fact1.factType &&
                    ((s.factValue1.toLowerCase() === fact1.factValue.toLowerCase() &&
                      s.factValue2.toLowerCase() === fact2.factValue.toLowerCase()) ||
                      (s.factValue1.toLowerCase() === fact2.factValue.toLowerCase() &&
                        s.factValue2.toLowerCase() === fact1.factValue.toLowerCase()))
                );

                if (similarity && similarity.score >= SIMILARITY_THRESHOLD) {
                  const edgeId = `${contact1Id}-${contact2Id}-${fact1.factType}`;
                  if (!edges.some((edge) => edge.id === edgeId)) {
                    edges.push({
                      id: edgeId,
                      source: contact1Id,
                      target: contact2Id,
                      factType: fact1.factType,
                      label: `${fact1.factValue} ≈ ${fact2.factValue}`,
                      similarity: similarity.score,
                    });
                    connectedContactIds.add(contact1Id);
                    connectedContactIds.add(contact2Id);
                  }
                }
              }
            }
          }
        }
      }

      // Build nodes for connected contacts
      const nodes: SimNode[] = contacts
        .filter((contact) => connectedContactIds.has(contact.id))
        .map((contact) => ({
          id: contact.id,
          contactId: contact.id,
          label: contact.firstName.charAt(0).toUpperCase(),
          x: Math.random() * GRAPH_WIDTH,
          y: Math.random() * GRAPH_HEIGHT,
        }));

      // Build links for d3-force
      const links: SimLink[] = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        factType: edge.factType,
        label: edge.label,
        similarity: edge.similarity,
      }));

      // Run d3-force simulation
      if (nodes.length > 0) {
        if (simulationRef.current) {
          simulationRef.current.stop();
        }

        const simulation = forceSimulation<SimNode>(nodes)
          .force(
            'link',
            forceLink<SimNode, SimLink>(links)
              .id((d: SimNode) => d.id)
              .distance(80)
          )
          .force('charge', forceManyBody().strength(-200))
          .force('center', forceCenter(GRAPH_WIDTH / 2, GRAPH_HEIGHT / 2))
          .force('collide', forceCollide(30));

        simulationRef.current = simulation;

        // Run simulation synchronously for initial layout
        simulation.tick(100);
        simulation.stop();
      }

      // Convert to output format
      const finalNodes: GraphNode[] = nodes.map((node) => ({
        id: node.id,
        contactId: node.contactId,
        label: node.label,
        x: node.x ?? GRAPH_WIDTH / 2,
        y: node.y ?? GRAPH_HEIGHT / 2,
        vx: node.vx ?? 0,
        vy: node.vy ?? 0,
      }));

      const unconnected = contacts.filter((contact) => !connectedContactIds.has(contact.id));

      setNetworkData({
        nodes: finalNodes,
        edges,
        unconnected,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du calcul du réseau');
    } finally {
      setIsLoading(false);
      setIsCalculating(false);
    }
  }, [contacts]);

  const refresh = useCallback(async () => {
    await loadContacts();
    await buildGraph(false);
  }, [loadContacts, buildGraph]);

  const forceRefresh = useCallback(async () => {
    await loadContacts();
    await buildGraph(true);
  }, [loadContacts, buildGraph]);

  useEffect(() => {
    if (contacts.length > 0) {
      buildGraph(false);
    } else {
      setIsLoading(false);
      setNetworkData({
        nodes: [],
        edges: [],
        unconnected: [],
      });
    }
  }, [contacts.length, buildGraph]);

  return {
    networkData,
    isLoading,
    isCalculating,
    error,
    refresh,
    forceRefresh,
  };
};
