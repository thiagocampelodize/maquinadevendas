import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Building2, ChevronRight, CreditCard, LogOut, Target, Users } from 'lucide-react-native';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useEntranceAnimation } from '@/components/ui/useEntranceAnimation';
import { ENTRANCE_ANIMATION_TOKENS } from '@/constants/animationTokens';
import { useAuth } from '@/contexts/AuthContext';
import { companiesService } from '@/services/companiesService';

export default function GestorProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    const loadCompany = async () => {
      if (!user?.company_id) {
        setCompanyName('Não vinculada');
        return;
      }
      const company = await companiesService.getCompanyById(user.company_id);
      setCompanyName(company?.name || 'Não vinculada');
    };

    void loadCompany();
  }, [user?.company_id]);

  const headerStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 0 });
  const actionsStyle = useEntranceAnimation({ ...ENTRANCE_ANIMATION_TOKENS.dashboard, index: 1 });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <Animated.View className="rounded-2xl border border-border bg-surface p-4" style={headerStyle}>
          <Text className="text-xl font-semibold text-white">Perfil do Gestor</Text>
          <Text className="mt-1 text-sm text-[#A3A3A3]">Gerencie metas, vendedores, empresa e assinatura.</Text>

          <View className="mt-4 rounded-xl border border-border bg-card p-3">
            <Text className="text-base font-semibold text-white">{user?.name || 'Gestor'}</Text>
            <Text className="mt-1 text-sm text-text-muted">{user?.email || '-'}</Text>
            <Text className="mt-1 text-xs text-text-faint">Empresa: {companyName || 'Carregando...'}</Text>
          </View>
        </Animated.View>

        <Animated.View style={actionsStyle} className="gap-3">
          <ProfileActionCard
            icon={<Target size={18} color="#FF6B35" />}
            title="Configurar Metas"
            subtitle="Defina metas do mês e ajuste projeções da equipe."
            onPress={() => router.push('/(gestor)/perfil/metas')}
          />
          <ProfileActionCard
            icon={<Users size={18} color="#FF6B35" />}
            title="Gerenciar Vendedores"
            subtitle="Cadastre, edite e ative/desative vendedores."
            onPress={() => router.push('/(gestor)/perfil/vendedores')}
          />
          <ProfileActionCard
            icon={<Building2 size={18} color="#FF6B35" />}
            title="Dados da Empresa"
            subtitle="Atualize nome e dados gerais da empresa."
            onPress={() => router.push('/(gestor)/perfil/empresa')}
          />
          <ProfileActionCard
            icon={<CreditCard size={18} color="#FF6B35" />}
            title="Assinatura"
            subtitle="Acompanhe plano atual e status da conta."
            onPress={() => router.push('/(gestor)/perfil/assinatura')}
          />

          <Pressable className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-[#7F1D1D] bg-[#2A0F0F]" onPress={() => void signOut()}>
            <LogOut size={16} color="#FCA5A5" />
            <Text className="text-base font-semibold text-red-300">Sair da Conta</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileActionCard({
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
            <Text className="text-left text-base font-semibold text-white">{title}</Text>
            <Text className="mt-1 text-left text-sm text-text-muted">{subtitle}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#6B7280" />
      </View>
    </Pressable>
  );
}
