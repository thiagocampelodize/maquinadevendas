import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { adminService } from '@/services/adminService';

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<{ id: string; title: string; generatedAt: string; format: string }>>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await adminService.getReportsSummary();
      setItems(data);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.navigate('/(admin)/mais')}
          title="Relatórios"
          subtitle="Histórico de geração e exportação dos relatórios administrativos."
        />

        <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
          <Text className="text-base font-semibold text-white">Últimos relatórios</Text>
          {loading ? (
            <View className="py-8">
              <ActivityIndicator color="#FF6B35" />
              <Text className="mt-2 text-center text-sm text-[#9CA3AF]">Gerando visão de relatórios...</Text>
            </View>
          ) : (
            <View className="mt-3 gap-2">
              {items.map((report) => (
                <View key={report.id} className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-3">
                  <View className="flex-row items-center gap-2">
                    <FileText size={14} color="#FF6B35" />
                    <Text className="flex-1 text-sm font-semibold text-white">{report.title}</Text>
                  </View>
                  <Text className="mt-1 text-xs text-[#9CA3AF]">Gerado em {report.generatedAt}</Text>
                  <Text className="text-xs text-[#9CA3AF]">Formato: {report.format}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
