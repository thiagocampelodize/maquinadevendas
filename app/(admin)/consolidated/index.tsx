import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { adminService } from '@/services/adminService';

export default function ConsolidatedDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<{ module: string; health: number; incidents: number }>>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await adminService.getConsolidatedHealth();
      setItems(data);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.navigate('/(admin)/mais')}
          title="Dashboard Consolidado"
          subtitle="Saúde operacional por módulo com visão executiva."
        />

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-base font-semibold text-white">Saúde dos módulos</Text>
          {loading ? (
            <View className="py-8">
              <ActivityIndicator color="#FF6B35" />
              <Text className="mt-2 text-center text-sm text-text-muted">Carregando consolidado...</Text>
            </View>
          ) : (
            <View className="mt-3 gap-2">
              {items.map((item) => (
                <View key={item.module} className="rounded-xl border border-border bg-card p-3">
                  <Text className="text-sm font-semibold text-white">{item.module}</Text>
                  <Text className="mt-1 text-xs text-text-muted">Incidentes no período: {item.incidents}</Text>
                  <Text className={`mt-1 text-xs font-semibold ${item.health >= 97 ? 'text-[#34D399]' : item.health >= 90 ? 'text-[#F59E0B]' : 'text-[#F87171]'}`}>
                    Health score: {item.health}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
