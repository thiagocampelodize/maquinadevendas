import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, LineChart, LogOut, UserCog } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { companiesService } from '@/services/companiesService';

export default function VendedorProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user?.company_id) {
        setCompanyName('Não vinculada');
        return;
      }
      const company = await companiesService.getCompanyById(user.company_id);
      setCompanyName(company?.name || 'Não vinculada');
    };
    void load();
  }, [user?.company_id]);

  const initials = useMemo(() => {
    const parts = (user?.name || 'Vendedor').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }, [user?.name]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-xl font-semibold text-white">Meu Perfil</Text>
          <Text className="mt-1 text-sm text-text-muted">Gerencie seus dados e acompanhe seu desempenho.</Text>

          <View className="mt-4 flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#FF6B35]">
              <Text className="text-base font-bold text-white">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">{user?.name || 'Vendedor'}</Text>
              <Text className="text-sm text-text-muted">{user?.email || '-'}</Text>
              <Text className="mt-1 text-xs text-text-faint">Empresa: {companyName || 'Carregando...'}</Text>
            </View>
          </View>
        </View>

        <MenuCard
          icon={<UserCog size={18} color="#FF6B35" />}
          title="Minha conta"
          subtitle="Atualize nome, telefone e senha."
          onPress={() => router.push('/(vendedor)/perfil/conta')}
        />

        <MenuCard
          icon={<LineChart size={18} color="#FF6B35" />}
          title="Meu desempenho"
          subtitle="Veja evolução e comparativos da sua performance."
          onPress={() => router.push('/(vendedor)/perfil/desempenho')}
        />

        <Pressable className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-[#7F1D1D] bg-[#2A0F0F]" onPress={() => void signOut()}>
          <LogOut size={16} color="#FCA5A5" />
          <Text className="text-base font-semibold text-red-300">Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable className="rounded-2xl border border-border bg-surface" onPress={onPress}>
      <View className="w-full flex-row items-center justify-between p-4">
        <View className="flex-1 flex-row items-start gap-3">
          <View className="mt-0.5">{icon}</View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-white">{title}</Text>
            <Text className="mt-1 text-sm text-text-muted">{subtitle}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#6B7280" />
      </View>
    </Pressable>
  );
}
