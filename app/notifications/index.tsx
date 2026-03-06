import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { SubmenuActionsCard } from '@/components/ui/SubmenuActionsCard';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, loading, markAsRead, markAllAsRead, unreadCount, reload } = useNotifications(user?.id);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="px-4 pt-4">
        <SubmenuHeaderCard
          onBack={() => router.back()}
          title="Notificações"
          subtitle="Acompanhe comunicados e atualizações da equipe."
          right={<Text className="text-xs text-[#9CA3AF]">Não lidas: {unreadCount}</Text>}
        />
      </View>

      <View className="px-4 pt-4">
        <SubmenuActionsCard>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button variant="outline" className="h-12 rounded-xl" onPress={() => void reload()}>
                Atualizar
              </Button>
            </View>
            <View className="flex-1">
              <Button className="h-12 rounded-xl" onPress={() => void markAllAsRead()}>
                Marcar todas
              </Button>
            </View>
          </View>
        </SubmenuActionsCard>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ gap: 10, paddingTop: 16, paddingBottom: 24 }}>
        {loading ? <Text className="text-[#9CA3AF]">Carregando...</Text> : null}

        {!loading && items.length === 0 ? (
          <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
            <Text className="text-[#9CA3AF]">Nenhuma notificação encontrada.</Text>
          </View>
        ) : null}

        {items.map((notification) => (
          <Pressable
            key={notification.id}
            className={`rounded-xl border p-4 ${notification.read ? 'border-[#2D2D2D] bg-[#1A1A1A]' : 'border-[#FF6B35] bg-[#FF6B3515]'}`}
            onPress={() => void markAsRead(notification.id)}
          >
            <View className="mb-1 flex-row items-center justify-between gap-2">
              <Text className={`flex-1 text-sm font-semibold ${notification.read ? 'text-white' : 'text-[#FF6B35]'}`}>
                {notification.title}
              </Text>
              <Text className="text-[10px] text-[#9CA3AF]">
                {new Date(notification.created_at).toLocaleString('pt-BR')}
              </Text>
            </View>
            <Text className="text-sm text-[#D1D5DB]">{notification.message || 'Sem mensagem adicional.'}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
