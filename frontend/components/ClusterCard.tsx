import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, User } from 'lucide-react-native';
import { Cluster, Contact } from '@/types';

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
    <View className="mb-5 rounded-2xl overflow-hidden bg-surface">
      <Pressable
        onPress={toggleExpand}
        className="flex-row items-center justify-between p-5"
        style={{ borderLeftWidth: 4, borderLeftColor: cluster.color }}
      >
        <View className="flex-row items-center flex-1">
          <View
            className="w-12 h-12 rounded-xl items-center justify-center mr-4"
            style={{ backgroundColor: `${cluster.color}20` }}
          >
            <Text className="text-2xl">{cluster.emoji}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-textPrimary font-semibold text-base" numberOfLines={2}>
              {cluster.label}
            </Text>
            <Text className="text-textMuted text-sm mt-1">
              {cluster.contacts.length} contact{cluster.contacts.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: `${cluster.color}15` }}
        >
          {isExpanded ? (
            <ChevronUp size={18} color={cluster.color} />
          ) : (
            <ChevronDown size={18} color={cluster.color} />
          )}
        </View>
      </Pressable>

      {isExpanded && (
        <View className="px-5 pb-5 pt-2">
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {cluster.contacts.map((contact) => (
              <Pressable
                key={contact.id}
                onPress={() => handleContactPress(contact)}
                className="bg-background rounded-xl p-4 flex-row items-center"
                style={{ minWidth: 150 }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: `${cluster.color}25` }}
                >
                  <User size={18} color={cluster.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-textPrimary font-semibold text-base" numberOfLines={1}>
                    {contact.firstName}
                  </Text>
                  {contact.lastName && (
                    <Text className="text-textMuted text-sm" numberOfLines={1}>
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
