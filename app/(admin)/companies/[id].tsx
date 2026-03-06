import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { companiesService, type AdminCompanyListItem } from '@/services/companiesService';

export default function CompanyDetailsPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<AdminCompanyListItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await companiesService.getAdminCompanies();
      setCompanies(data);
      setLoading(false);
    };

    void load();
  }, []);

  const company = useMemo(() => companies.find((item) => item.id === id), [companies, id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black" edges={['left', 'right']}>
        <ActivityIndicator color="#FF6B35" />
        <Text className="mt-2 text-sm text-[#9CA3AF]">Carregando detalhes...</Text>
      </SafeAreaView>
    );
  }

  if (!company) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-white">Empresa não encontrada</Text>
          <Text className="mt-2 text-center text-sm text-[#9CA3AF]">O identificador informado não corresponde a uma empresa cadastrada.</Text>
          <Button className="mt-4" onPress={() => router.replace('/(admin)/companies')}>
            Voltar para empresas
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <Pressable className="mb-1 flex-row items-center gap-2" onPress={() => router.replace('/(admin)/companies')}>
          <ArrowLeft size={16} color="#9CA3AF" />
          <Text className="text-sm text-[#9CA3AF]">Voltar para empresas</Text>
        </Pressable>

        <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
          <Text className="text-xl font-semibold text-white">{company.name}</Text>
          <Text className="mt-1 text-sm text-[#9CA3AF]">Detalhes principais da organização no painel administrativo.</Text>

          <View className="mt-4 gap-2 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-3">
            <Info label="Gestor" value={company.managerName} />
            <Info label="Email" value={company.email} />
            <Info label="Plano" value={company.plan} />
            <Info label="Status" value={company.status} />
            <Info label="Usuários" value={`${company.usersCount}`} />
            <Info label="Criada em" value={new Date(company.createdAt).toLocaleDateString('pt-BR')} />
            <Info label="Próxima cobrança" value={company.nextBilling || '-'} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-xs text-[#9CA3AF]">{label}</Text>
      <Text className="text-sm font-medium text-white">{value}</Text>
    </View>
  );
}
