import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubmenuActionsCard } from '@/components/ui/SubmenuActionsCard';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { useAuth } from '@/contexts/AuthContext';
import { companiesService, type Company } from '@/services/companiesService';
import { usersService } from '@/services/usersService';

export default function SubscriptionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [sellersCount, setSellersCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const [companyData, sellers] = await Promise.all([
        companiesService.getCompanyById(companyId),
        usersService.getSellersByCompany(companyId, { includeInactive: true }),
      ]);
      setCompany(companyData);
      setSellersCount(sellers.length);
      setLoading(false);
    };
    void load();
  }, [companyId]);

  const statusBadge = useMemo(() => {
    if (!company?.status) return { text: 'Sem status', className: 'bg-[#3F3F46]' };
    if (company.status === 'active') return { text: 'Ativo', className: 'bg-[#14532D]' };
    if (company.status === 'suspended') return { text: 'Suspenso', className: 'bg-[#7F1D1D]' };
    return { text: 'Inativo', className: 'bg-[#3F3F46]' };
  }, [company?.status]);

  const planName = useMemo(() => {
    if (!company?.plan_id) return 'Plano Essencial';
    return `Plano ${company.plan_id}`;
  }, [company?.plan_id]);

  if (!companyId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-lg font-semibold text-white">Sem empresa vinculada</Text>
        <Text className="mt-2 text-center text-[#9CA3AF]">Vincule uma empresa para acompanhar a assinatura.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.replace('/(gestor)/perfil')}
          title="Assinatura"
          subtitle="Acompanhe plano contratado e situação da conta."
        />

        {loading ? (
          <View className="mt-2 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text className="text-sm text-[#9CA3AF]">Carregando dados da assinatura...</Text>
          </View>
        ) : (
          <>
            <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base text-[#D1D5DB]">Plano atual</Text>
                <View className={`rounded-full px-2 py-1 ${statusBadge.className}`}>
                  <Text className="text-xs text-white">{statusBadge.text}</Text>
                </View>
              </View>

              <Text className="mt-2 text-2xl font-semibold text-white">{planName}</Text>
              <Text className="mt-1 text-sm text-[#9CA3AF]">
                Empresa: {company?.name || '-'}
              </Text>
              <Text className="mt-1 text-sm text-[#9CA3AF]">
                Vendedores cadastrados: {sellersCount}
              </Text>
              <Text className="mt-1 text-sm text-[#9CA3AF]">
                Desde {company?.created_at ? new Date(company.created_at).toLocaleDateString('pt-BR') : '-'}
              </Text>
            </View>

            <SubmenuActionsCard>
              <Text className="text-base font-semibold text-white">Ajustes de assinatura</Text>
              <Text className="mt-1 text-sm text-[#9CA3AF]">
                Em breve, você poderá gerenciar upgrade, downgrade e status da assinatura por aqui.
              </Text>
            </SubmenuActionsCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
