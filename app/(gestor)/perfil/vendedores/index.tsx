import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pencil, UserRound, X } from 'lucide-react-native';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { SubmenuActionsCard } from '@/components/ui/SubmenuActionsCard';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { usersService } from '@/services/usersService';
import { formatCurrency, parseCurrency } from '@/utils/masks';

interface SellerRow {
  id: string;
  full_name: string;
  email: string;
  active: boolean;
  individual_goal?: number | null;
  daily_goal?: number | null;
}

export default function SellersListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToastContext();
  const companyId = user?.company_id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [search, setSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<SellerRow | null>(null);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [dailyGoal, setDailyGoal] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [quickTogglingSellerId, setQuickTogglingSellerId] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(isModalOpen, MODAL_ANIMATION_PRESETS.sheet);

  const visibleSellers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sellers.filter((seller) => {
      if (onlyActive && !seller.active) return false;
      if (!term) return true;
      return seller.full_name.toLowerCase().includes(term) || seller.email.toLowerCase().includes(term);
    });
  }, [onlyActive, search, sellers]);

  const loadSellers = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const data = await usersService.getSellersByCompany(companyId, { includeInactive: true });
    setSellers(data as SellerRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadSellers();
  }, [companyId]);

  const openNewModal = () => {
    setEditingSeller(null);
    setName('');
    setGoal('');
    setDailyGoal('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (seller: SellerRow) => {
    setEditingSeller(seller);
    setName(seller.full_name || '');
    setGoal(seller.individual_goal ? formatCurrency(seller.individual_goal) : '');
    setDailyGoal(seller.daily_goal ? formatCurrency(seller.daily_goal) : '');
    setStatus(seller.active ? 'active' : 'inactive');
    setIsModalOpen(true);
  };

  const saveSeller = async () => {
    if (!companyId) {
      toast.error('Empresa não vinculada.');
      return;
    }

    if (!name.trim()) {
      toast.error('Informe o nome do vendedor.');
      return;
    }

    setSaving(true);
    try {
      if (editingSeller) {
        const updated = await usersService.updateUser(editingSeller.id, {
          full_name: name.trim(),
          individual_goal: parseCurrency(goal),
          daily_goal: parseCurrency(dailyGoal),
          active: status === 'active',
        });
        if (!updated) {
          toast.error('Não foi possível atualizar o vendedor.');
          return;
        }
      } else {
        const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const created = await usersService.createUser({
          email: `${sanitized}.${Date.now()}@temp.com`,
          full_name: name.trim(),
          role: 'VENDEDOR',
          company_id: companyId,
          active: status === 'active',
          individual_goal: parseCurrency(goal),
          daily_goal: parseCurrency(dailyGoal),
          daily_goal_custom: parseCurrency(dailyGoal) > 0,
          password_hash: '123456',
        });
        if (!created) {
          toast.error('Não foi possível criar o vendedor.');
          return;
        }
      }

      setIsModalOpen(false);
      toast.success(editingSeller ? 'Vendedor atualizado com sucesso!' : 'Vendedor criado com sucesso!');
      await loadSellers();
    } finally {
      setSaving(false);
    }
  };

  const toggleSellerStatus = async (seller: SellerRow) => {
    setQuickTogglingSellerId(seller.id);
    try {
      const updated = await usersService.updateUser(seller.id, { active: !seller.active });
      if (!updated) {
        toast.error('Não foi possível alterar o status do vendedor.');
        return;
      }
      toast.success(seller.active ? 'Vendedor inativado.' : 'Vendedor ativado.');
      await loadSellers();
    } finally {
      setQuickTogglingSellerId(null);
    }
  };

  if (!companyId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-lg font-semibold text-white">Sem empresa vinculada</Text>
        <Text className="mt-2 text-center text-[#9CA3AF]">Vincule uma empresa para gerenciar vendedores.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.replace('/(gestor)/perfil')}
          title="Gerenciar Vendedores"
          subtitle="Cadastre e atualize metas individuais do time."
        />

        <SubmenuActionsCard>
          <Button className="h-12 rounded-xl" onPress={openNewModal}>
            + Novo vendedor
          </Button>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome ou email"
            placeholderTextColor="#6B7280"
            className="h-12 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
          />
          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={() => setOnlyActive(false)}
              className={`flex-1 rounded-xl border px-3 py-2 ${!onlyActive ? 'border-[#FF6B35] bg-[#FF6B3522]' : 'border-[#2D2D2D] bg-[#1A1A1A]'}`}
            >
              <Text className={`text-center text-sm font-semibold ${!onlyActive ? 'text-[#FF6B35]' : 'text-[#D1D5DB]'}`}>Todos</Text>
            </Pressable>
            <Pressable
              onPress={() => setOnlyActive(true)}
              className={`flex-1 rounded-xl border px-3 py-2 ${onlyActive ? 'border-[#22C55E] bg-[#14532D]' : 'border-[#2D2D2D] bg-[#1A1A1A]'}`}
            >
              <Text className="text-center text-sm font-semibold text-white">Somente ativos</Text>
            </Pressable>
          </View>
        </SubmenuActionsCard>

        {loading ? (
          <View className="mt-2 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text className="text-sm text-[#9CA3AF]">Carregando vendedores...</Text>
          </View>
        ) : visibleSellers.length === 0 ? (
          <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
            <Text className="text-sm text-[#9CA3AF]">Nenhum vendedor encontrado com os filtros atuais.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {visibleSellers.map((seller) => (
              <View key={seller.id} className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center gap-2">
                      <UserRound size={16} color="#FF6B35" />
                      <Text className="text-base font-semibold text-white">{seller.full_name}</Text>
                    </View>
                    <Text className="mt-1 text-xs text-[#9CA3AF]">{seller.email}</Text>
                    <Text className="mt-2 text-sm text-[#D1D5DB]">
                      Meta individual: {seller.individual_goal ? seller.individual_goal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não definida'}
                    </Text>
                    <Text className="mt-1 text-sm text-[#9CA3AF]">
                      Meta diária: {seller.daily_goal ? seller.daily_goal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não definida'}
                    </Text>
                  </View>

                  <View className="items-end gap-2">
                    <View className={`rounded-full px-2 py-1 ${seller.active ? 'bg-[#14532D]' : 'bg-[#3F3F46]'}`}>
                      <Text className="text-xs text-white">{seller.active ? 'Ativo' : 'Inativo'}</Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Pressable
                        className={`rounded-lg border p-2 ${seller.active ? 'border-red-900 bg-[#2A0F0F]' : 'border-green-900 bg-[#0F2A16]'}`}
                        onPress={() => void toggleSellerStatus(seller)}
                      >
                        {quickTogglingSellerId === seller.id ? (
                          <ActivityIndicator size="small" color="#D1D5DB" />
                        ) : (
                          <Text className={`text-xs font-semibold ${seller.active ? 'text-red-300' : 'text-green-300'}`}>
                            {seller.active ? 'Inativar' : 'Ativar'}
                          </Text>
                        )}
                      </Pressable>
                      <Pressable className="rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] p-2" onPress={() => openEditModal(seller)}>
                        <Pencil size={14} color="#D1D5DB" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {shouldRender ? (
        <Modal visible={shouldRender} transparent animationType="none" onRequestClose={() => setIsModalOpen(false)}>
          <Animated.View style={animatedBackdropStyle} className="flex-1 bg-black/80">
            <Animated.View
              style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
              className="flex-1 rounded-t-2xl border border-[#2D2D2D] bg-[#111111] p-4"
            >
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-white">{editingSeller ? 'Editar vendedor' : 'Novo vendedor'}</Text>
                <Pressable onPress={() => setIsModalOpen(false)}>
                  <X size={18} color="#9CA3AF" />
                </Pressable>
              </View>

              <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
                <Field label="Nome">
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Nome completo"
                    placeholderTextColor="#6B7280"
                    className="h-12 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
                  />
                </Field>

                <Field label="Meta individual">
                  <TextInput
                    value={goal}
                    onChangeText={(v) => setGoal(formatCurrency(v))}
                    placeholder="0,00"
                    keyboardType="numeric"
                    placeholderTextColor="#6B7280"
                    className="h-12 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
                  />
                </Field>

                <Field label="Meta diária">
                  <TextInput
                    value={dailyGoal}
                    onChangeText={(v) => setDailyGoal(formatCurrency(v))}
                    placeholder="0,00"
                    keyboardType="numeric"
                    placeholderTextColor="#6B7280"
                    className="h-12 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
                  />
                </Field>

                <Field label="Status">
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => setStatus('active')}
                      className={`flex-1 rounded-xl border px-3 py-2 ${status === 'active' ? 'border-green-500 bg-[#14532D]' : 'border-[#2D2D2D] bg-[#1A1A1A]'}`}
                    >
                      <Text className="text-center font-semibold text-white">Ativo</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setStatus('inactive')}
                      className={`flex-1 rounded-xl border px-3 py-2 ${status === 'inactive' ? 'border-red-500 bg-[#7F1D1D]' : 'border-[#2D2D2D] bg-[#1A1A1A]'}`}
                    >
                      <Text className="text-center font-semibold text-white">Inativo</Text>
                    </Pressable>
                  </View>
                </Field>

                <Button onPress={() => void saveSeller()} loading={saving}>
                  {editingSeller ? 'Salvar alterações' : 'Cadastrar vendedor'}
                </Button>
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-2 text-sm text-[#D1D5DB]">{label}</Text>
      {children}
    </View>
  );
}
