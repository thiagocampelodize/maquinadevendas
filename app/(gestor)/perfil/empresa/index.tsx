import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { companiesService, type Company } from '@/services/companiesService';
import { settingsService } from '@/services/settingsService';

export default function CompanyDetailsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToastContext();
  const companyId = user?.company_id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRetro, setSavingRetro] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [retroDays, setRetroDays] = useState('30');

  const loadCompany = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [data, daysLimit] = await Promise.all([
      companiesService.getCompanyById(companyId),
      settingsService.getRetroactiveDaysLimit(companyId),
    ]);
    setCompany(data);
    setCompanyName(data?.name || '');
    setRetroDays(String(daysLimit));
    setLoading(false);
  };

  useEffect(() => {
    void loadCompany();
  }, [companyId]);

  const saveCompany = async () => {
    if (!companyId) {
      toast.error('Empresa não vinculada.');
      return;
    }
    if (!companyName.trim()) {
      toast.error('Informe o nome da empresa.');
      return;
    }

    setSaving(true);
    try {
      const updated = await companiesService.updateCompany(companyId, { name: companyName.trim() });
      if (!updated) {
        toast.error('Não foi possível atualizar os dados da empresa.');
        return;
      }
      toast.success('Dados da empresa atualizados!');
      setCompany(updated);
    } finally {
      setSaving(false);
    }
  };

  const saveRetroactiveDays = async () => {
    if (!companyId) return;
    const parsed = Number(retroDays);
    if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
      toast.error('Informe um número inteiro maior ou igual a 0.');
      return;
    }
    setSavingRetro(true);
    try {
      const success = await settingsService.updateRetroactiveDaysLimit(companyId, parsed);
      if (!success) {
        toast.error('Não foi possível salvar a configuração de retroatividade.');
        return;
      }
      toast.success('Limite de retroatividade atualizado!');
    } finally {
      setSavingRetro(false);
    }
  };

  if (!companyId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-lg font-semibold text-white">Sem empresa vinculada</Text>
        <Text className="mt-2 text-center text-[#9CA3AF]">Vincule uma empresa para editar os dados.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.replace('/(gestor)/perfil')}
          title="Dados da Empresa"
          subtitle="Mantenha as informações cadastrais sempre atualizadas."
        />

        {loading ? (
          <View className="mt-2 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text className="text-sm text-[#9CA3AF]">Carregando dados da empresa...</Text>
          </View>
        ) : (
          <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
            <Text className="mb-2 text-sm text-[#D1D5DB]">Nome da empresa</Text>
            <TextInput
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Nome da empresa"
              placeholderTextColor="#6B7280"
              className="h-12 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
            />

            <View className="mt-4 gap-2 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-3">
              <InfoRow label="ID da empresa" value={company?.id || '-'} />
              <InfoRow label="Status" value={company?.status || '-'} />
              <InfoRow label="Plano" value={company?.plan_id || 'Sem plano'} />
              <InfoRow
                label="Criada em"
                value={company?.created_at ? new Date(company.created_at).toLocaleDateString('pt-BR') : '-'}
              />
            </View>

            <View className="mt-4">
              <Button className="h-12 rounded-xl" onPress={() => void saveCompany()} loading={saving}>
                Salvar dados da empresa
              </Button>
            </View>

            <View className="mt-4 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-4">
              <Text className="mb-1 text-sm font-medium text-white">📅 Retroatividade de Lançamento</Text>
              <Text className="mb-3 text-xs text-[#9CA3AF]">
                Define até quantos dias no passado um lançamento de venda pode ser registrado.
              </Text>
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={retroDays}
                  onChangeText={setRetroDays}
                  keyboardType="number-pad"
                  placeholder="30"
                  placeholderTextColor="#6B7280"
                  className="h-11 w-24 rounded-xl border border-[#2D2D2D] bg-[#111111] px-3 text-white"
                />
                <Text className="text-sm text-[#9CA3AF]">dias para trás</Text>
              </View>
              <View className="mt-3">
                <Button
                  className="h-11 rounded-xl"
                  onPress={() => void saveRetroactiveDays()}
                  loading={savingRetro}
                >
                  Salvar retroatividade
                </Button>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-[#9CA3AF]">{label}</Text>
      <Text className="max-w-[65%] text-right text-sm text-white">{value}</Text>
    </View>
  );
}
