import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Activity, BarChart3, Briefcase, Building2, DollarSign, FileText, Lock, Settings, Users } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { adminService } from '@/services/adminService';
import { companiesService, type AdminCompanyListItem } from '@/services/companiesService';
import { usersService, type AdminUserListItem } from '@/services/usersService';

export default function DashboardAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<AdminCompanyListItem[]>([]);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [mrr, setMrr] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [companiesData, usersData, financialData] = await Promise.all([
        companiesService.getAdminCompanies(),
        usersService.getAdminUsers(),
        adminService.getFinancialMetrics(),
      ]);
      setCompanies(companiesData);
      setUsers(usersData);
      setMrr(financialData.mrr);
      setLoading(false);
    };
    void load();
  }, []);

  const activeCompanies = companies.filter((company) => company.status === 'Ativo').length;
  const activeSubscriptions = companies.filter((company) => company.status === 'Ativo' || company.status === 'Atraso').length;

  const quickActions = [
    { label: 'Empresas', subtitle: 'Gestao de empresas e gestores', icon: Building2, route: '/(admin)/companies' as const },
    { label: 'Usuários', subtitle: 'Controle de acessos e perfis', icon: Users, route: '/(admin)/users' as const },
    { label: 'Precos', subtitle: 'Regras de plano por usuario', icon: FileText, route: '/(admin)/plans' as const },
    { label: 'Acesso Temp.', subtitle: 'Liberações temporárias', icon: Lock, route: '/(admin)/temp-access' as const },
    { label: 'Financeiro', subtitle: 'MRR, inadimplencia e ticket', icon: DollarSign, route: '/(admin)/financial' as const },
    { label: 'Assinaturas', subtitle: 'Status de contratos ativos', icon: Activity, route: '/(admin)/subscriptions' as const },
    { label: 'Relatórios', subtitle: 'Exportações e analíticos', icon: BarChart3, route: '/(admin)/reports' as const },

  ];

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
          <Text className="text-2xl font-bold text-white">Dashboard Administrativo</Text>
          <Text className="mt-1 text-sm text-[#9CA3AF]">Visão geral de desempenho, empresas e receitas da plataforma.</Text>
        </View>

        <View className="gap-3">
          <AdminStatCard
            title="Desempenho Geral"
            value={loading ? '...' : mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            icon={DollarSign}
            tone="green"
            subtitle="Receita mensal recorrente (MRR)"
          />
          <AdminStatCard
            title="Empresas Ativas"
            value={`${activeCompanies}`}
            icon={Briefcase}
            tone="blue"
            subtitle={`Total: ${companies.length} organizações`}
          />
          <AdminStatCard title="Usuários Totais" value={`${users.length}`} icon={Users} tone="orange" subtitle="Usuários cadastrados na base" />
          <AdminStatCard
            title="Assinaturas"
            value={`${activeSubscriptions}`}
            icon={Activity}
            tone="gray"
            subtitle="Contratos ativos em ciclo de cobrança"
          />
        </View>

        <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
          <Text className="text-lg font-semibold text-white">Ações Rápidas</Text>
          <View className="mt-3 gap-2">
            {quickActions.map((action) => (
              <Pressable
                key={action.route}
                className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-3"
                onPress={() => router.push(action.route)}
              >
                <View className="flex-row items-center gap-3">
                  <View className="rounded-lg bg-[#2A1A12] p-2">
                    <action.icon size={16} color="#FF6B35" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-white">{action.label}</Text>
                    <Text className="text-xs text-[#9CA3AF]">{action.subtitle}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
          <Text className="text-lg font-semibold text-white">Organizações Recentes</Text>
          <Text className="mt-1 text-xs text-[#6B7280]">Ultimos cadastros monitorados no painel.</Text>
          <View className="mt-3 gap-2">
            {loading ? (
              <View className="py-6">
                <ActivityIndicator color="#FF6B35" />
              </View>
            ) : (
              companies.slice(0, 4).map((company) => (
              <Pressable key={company.id} className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-3" onPress={() => router.push(`/(admin)/companies/${company.id}`)}>
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-white">{company.name}</Text>
                    <Text className="mt-0.5 text-xs text-[#9CA3AF]">{company.plan} • {company.usersCount} usuários</Text>
                  </View>
                  <StatusBadge status={company.status} />
                </View>
              </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: AdminCompanyListItem['status'] }) {
  const toneByStatus: Record<AdminCompanyListItem['status'], { bg: string; text: string }> = {
    Ativo: { bg: '#153A2E', text: '#34D399' },
    Atraso: { bg: '#3D2C0F', text: '#F59E0B' },
    Inativo: { bg: '#1F2937', text: '#9CA3AF' },
    Suspensa: { bg: '#3D1616', text: '#F87171' },
    Cancelada: { bg: '#3D1616', text: '#F87171' },
    Expirada: { bg: '#3D2C0F', text: '#F59E0B' },
  };

  const tone = toneByStatus[status];
  return (
    <View className="rounded-md px-2 py-1" style={{ backgroundColor: tone.bg }}>
      <Text className="text-xs font-semibold" style={{ color: tone.text }}>
        {status}
      </Text>
    </View>
  );
}
