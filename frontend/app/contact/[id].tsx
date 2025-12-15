import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContacts } from '@/hooks/useContacts';
import { ContactWithDetails, Fact } from '@/types';
import { factService } from '@/services/fact.service';
import { Edit3, Trash2, Plus, ChevronDown, ChevronUp, X, Check } from 'lucide-react-native';

type EditingFact = {
  id: string;
  factKey: string;
  factValue: string;
};

type EditingHighlight = {
  index: number;
  value: string;
};

export default function ContactDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const contactId = params.id as string;

  const { getContactById, deleteContact, updateContact } = useContacts();
  const [contact, setContact] = useState<ContactWithDetails | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedLastName, setEditedLastName] = useState('');

  const [editingFact, setEditingFact] = useState<EditingFact | null>(null);
  const [expandedFactId, setExpandedFactId] = useState<string | null>(null);

  const [editingHighlight, setEditingHighlight] = useState<EditingHighlight | null>(null);
  const [newHighlight, setNewHighlight] = useState('');
  const [isAddingHighlight, setIsAddingHighlight] = useState(false);

  const loadContact = useCallback(async () => {
    const loaded = await getContactById(contactId);
    setContact(loaded);
    if (loaded) {
      setEditedFirstName(loaded.firstName);
      setEditedLastName(loaded.lastName || '');
    }
  }, [contactId, getContactById]);

  useFocusEffect(
    useCallback(() => {
      loadContact();
    }, [loadContact])
  );

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le contact',
      `Êtes-vous sûr de vouloir supprimer ${contact?.firstName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (contact) {
              await deleteContact(contact.id);
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleSaveName = async () => {
    if (!contact || !editedFirstName.trim()) return;
    await updateContact(contact.id, {
      firstName: editedFirstName.trim(),
      lastName: editedLastName.trim() || undefined,
    });
    await loadContact();
    setIsEditingName(false);
  };

  const handleSaveFact = async () => {
    if (!editingFact) return;
    await factService.update(editingFact.id, {
      factKey: editingFact.factKey,
      factValue: editingFact.factValue,
    });
    await loadContact();
    setEditingFact(null);
  };

  const handleDeleteFact = (fact: Fact) => {
    Alert.alert(
      'Supprimer cette information',
      `Supprimer "${fact.factKey}: ${fact.factValue}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await factService.delete(fact.id);
            await loadContact();
          },
        },
      ]
    );
  };

  const handleAddHighlight = async () => {
    if (!contact || !newHighlight.trim()) return;
    const updatedHighlights = [...contact.highlights, newHighlight.trim()];
    await updateContact(contact.id, { highlights: updatedHighlights });
    await loadContact();
    setNewHighlight('');
    setIsAddingHighlight(false);
  };

  const handleSaveHighlight = async () => {
    if (!contact || !editingHighlight || !editingHighlight.value.trim()) return;
    const updatedHighlights = [...contact.highlights];
    updatedHighlights[editingHighlight.index] = editingHighlight.value.trim();
    await updateContact(contact.id, { highlights: updatedHighlights });
    await loadContact();
    setEditingHighlight(null);
  };

  const handleDeleteHighlight = (index: number) => {
    if (!contact) return;
    Alert.alert(
      'Supprimer ce point',
      'Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const updatedHighlights = contact.highlights.filter((_, idx) => idx !== index);
            await updateContact(contact.id, { highlights: updatedHighlights });
            await loadContact();
          },
        },
      ]
    );
  };

  if (!contact) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-textSecondary">Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background px-6"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      {/* Header with name */}
      <View className="mb-6 mt-4">
        {isEditingName ? (
          <View className="bg-surface p-4 rounded-lg">
            <Text className="text-textSecondary text-sm mb-2">Prénom</Text>
            <TextInput
              className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
              value={editedFirstName}
              onChangeText={setEditedFirstName}
              placeholder="Prénom"
              placeholderTextColor="#71717a"
            />
            <Text className="text-textSecondary text-sm mb-2">Nom</Text>
            <TextInput
              className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
              value={editedLastName}
              onChangeText={setEditedLastName}
              placeholder="Nom (optionnel)"
              placeholderTextColor="#71717a"
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-lg bg-surfaceHover items-center"
                onPress={() => {
                  setIsEditingName(false);
                  setEditedFirstName(contact.firstName);
                  setEditedLastName(contact.lastName || '');
                }}
              >
                <Text className="text-textSecondary">Annuler</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-lg bg-primary items-center"
                onPress={handleSaveName}
              >
                <Text className="text-white font-semibold">Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            className="flex-row items-center"
            onPress={() => setIsEditingName(true)}
          >
            <Text className="text-3xl font-bold text-textPrimary mr-3">
              {contact.firstName} {contact.lastName || contact.nickname || ''}
            </Text>
            <Edit3 size={20} color="#9CA3AF" />
          </Pressable>
        )}

        {contact.tags && contact.tags.length > 0 && !isEditingName && (
          <View className="flex-row gap-2 mt-3">
            {contact.tags.map((tag) => (
              <View key={tag} className="bg-primary/20 px-3 py-1 rounded">
                <Text className="text-primary">{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {contact.lastContactAt && !isEditingName && (
          <Text className="text-textSecondary mt-2">
            Dernier contact : {new Date(contact.lastContactAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Facts / Informations */}
      {contact.facts.length > 0 && (
        <View className="mb-6">
          <Text className="text-xl font-semibold text-textPrimary mb-3">
            Informations
          </Text>

          {contact.facts.map((fact) => (
            <View key={fact.id} className="bg-surface rounded-lg mb-2 overflow-hidden">
              {editingFact?.id === fact.id ? (
                <View className="p-4">
                  <TextInput
                    className="bg-background py-2 px-3 rounded-lg text-textSecondary text-sm mb-2"
                    value={editingFact.factKey}
                    onChangeText={(value) => setEditingFact({ ...editingFact, factKey: value })}
                    placeholder="Label"
                    placeholderTextColor="#71717a"
                  />
                  <TextInput
                    className="bg-background py-2 px-3 rounded-lg text-textPrimary mb-3"
                    value={editingFact.factValue}
                    onChangeText={(value) => setEditingFact({ ...editingFact, factValue: value })}
                    placeholder="Valeur"
                    placeholderTextColor="#71717a"
                  />
                  <View className="flex-row gap-2">
                    <Pressable
                      className="flex-1 py-2 rounded-lg bg-surfaceHover items-center"
                      onPress={() => setEditingFact(null)}
                    >
                      <Text className="text-textSecondary">Annuler</Text>
                    </Pressable>
                    <Pressable
                      className="flex-1 py-2 rounded-lg bg-primary items-center"
                      onPress={handleSaveFact}
                    >
                      <Text className="text-white font-semibold">OK</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View>
                  <Pressable
                    className="p-4 flex-row items-start justify-between"
                    onPress={() => setEditingFact({
                      id: fact.id,
                      factKey: fact.factKey,
                      factValue: fact.factValue,
                    })}
                  >
                    <View className="flex-1">
                      <Text className="text-textSecondary text-sm">{fact.factKey}</Text>
                      <Text className="text-textPrimary font-medium">{fact.factValue}</Text>
                      {fact.previousValues.length > 0 && (
                        <Pressable
                          className="flex-row items-center mt-1"
                          onPress={() => setExpandedFactId(
                            expandedFactId === fact.id ? null : fact.id
                          )}
                        >
                          <Text className="text-textMuted text-xs mr-1">
                            {fact.previousValues.length} ancien{fact.previousValues.length > 1 ? 's' : ''}
                          </Text>
                          {expandedFactId === fact.id ? (
                            <ChevronUp size={12} color="#71717a" />
                          ) : (
                            <ChevronDown size={12} color="#71717a" />
                          )}
                        </Pressable>
                      )}
                    </View>
                    <Pressable
                      className="p-2"
                      onPress={() => handleDeleteFact(fact)}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </Pressable>
                  </Pressable>

                  {expandedFactId === fact.id && fact.previousValues.length > 0 && (
                    <View className="px-4 pb-4 pt-0">
                      {fact.previousValues.map((prevValue, idx) => (
                        <View key={idx} className="flex-row items-center mt-1">
                          <View className="w-2 h-2 rounded-full bg-textMuted mr-2" />
                          <Text className="text-textMuted text-sm line-through">
                            {prevValue}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Highlights / Bullet points */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-semibold text-textPrimary">
            Points clés
          </Text>
          <Pressable
            className="p-2"
            onPress={() => setIsAddingHighlight(true)}
          >
            <Plus size={20} color="#8B5CF6" />
          </Pressable>
        </View>

        {isAddingHighlight && (
          <View className="bg-surface p-4 rounded-lg mb-3">
            <TextInput
              className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
              value={newHighlight}
              onChangeText={setNewHighlight}
              placeholder="Nouveau point clé..."
              placeholderTextColor="#71717a"
              multiline
              autoFocus
            />
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 py-2 rounded-lg bg-surfaceHover items-center"
                onPress={() => {
                  setIsAddingHighlight(false);
                  setNewHighlight('');
                }}
              >
                <Text className="text-textSecondary">Annuler</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-2 rounded-lg bg-primary items-center"
                onPress={handleAddHighlight}
              >
                <Text className="text-white font-semibold">Ajouter</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Auto-generated highlights from facts if no manual highlights */}
        {contact.highlights.length === 0 && !isAddingHighlight && (
          <>
            {contact.facts.filter((fact) =>
              ['hobby', 'sport', 'work', 'company', 'location'].includes(fact.factType)
            ).length > 0 ? (
              contact.facts
                .filter((fact) => ['hobby', 'sport', 'work', 'company', 'location'].includes(fact.factType))
                .slice(0, 4)
                .map((fact, index) => (
                  <View key={`auto-${index}`} className="bg-surface/50 rounded-lg mb-2 p-4 flex-row items-center">
                    <Text className="text-primary/70 mr-3">•</Text>
                    <Text className="text-textSecondary flex-1">
                      {fact.factKey}: {fact.factValue}
                    </Text>
                  </View>
                ))
            ) : (
              <View className="bg-surface/50 p-4 rounded-lg border border-dashed border-surfaceHover">
                <Text className="text-textMuted text-center">
                  Ajoutez des points clés manuellement
                </Text>
              </View>
            )}
          </>
        )}

        {contact.highlights.length > 0 && (
          contact.highlights.map((highlight, index) => (
            <View key={index} className="bg-surface rounded-lg mb-2 overflow-hidden">
              {editingHighlight?.index === index ? (
                <View className="p-4">
                  <TextInput
                    className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
                    value={editingHighlight.value}
                    onChangeText={(value) => setEditingHighlight({ ...editingHighlight, value })}
                    multiline
                    autoFocus
                  />
                  <View className="flex-row gap-2">
                    <Pressable
                      className="flex-1 py-2 rounded-lg bg-surfaceHover items-center"
                      onPress={() => setEditingHighlight(null)}
                    >
                      <Text className="text-textSecondary">Annuler</Text>
                    </Pressable>
                    <Pressable
                      className="flex-1 py-2 rounded-lg bg-primary items-center"
                      onPress={handleSaveHighlight}
                    >
                      <Text className="text-white font-semibold">OK</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  className="p-4 flex-row items-start"
                  onPress={() => setEditingHighlight({ index, value: highlight })}
                >
                  <Text className="text-primary mr-3">•</Text>
                  <Text className="text-textPrimary flex-1">{highlight}</Text>
                  <Pressable
                    className="p-1"
                    onPress={() => handleDeleteHighlight(index)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </Pressable>
                </Pressable>
              )}
            </View>
          ))
        )}
      </View>

      {/* Notes */}
      {contact.notes.length > 0 && (
        <View className="mb-6">
          <Text className="text-xl font-semibold text-textPrimary mb-3">
            Notes ({contact.notes.length})
          </Text>

          {contact.notes.map((note) => (
            <View key={note.id} className="bg-surface p-4 rounded-lg mb-3">
              {note.summary && (
                <Text className="text-textPrimary mb-2">{note.summary}</Text>
              )}
              <Text className="text-textMuted text-xs">
                {new Date(note.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Delete button */}
      <Pressable
        className="bg-error/20 border border-error py-3 rounded-lg items-center"
        onPress={handleDelete}
      >
        <Text className="text-error font-semibold">Supprimer le contact</Text>
      </Pressable>
    </ScrollView>
  );
}
