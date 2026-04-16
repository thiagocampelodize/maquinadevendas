import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Building2, Pencil, Search, Trash2 } from 'lucide-react-native';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';
import { useToastContext } from '@/contexts/ToastContext';
import { companiesService, type AdminCompanyListItem } from '@/services/companiesService';

const statusOptions = ['Ativo', 'Inativo', 'Atraso', 'Suspensa', 'Cancelada', 'Expirada'] as const;

export default function CompaniesManagementPage() {
  const router = useRouter();
  const toast = useToastContext();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyListItem[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Todos');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<AdminCompanyListItem | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingStatus, setEditingStatus] = useState<AdminCompanyListItem['status']>('Ativo');
  const isMountedRef = useRef(true);

  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(isEditOpen, MODAL_ANIMATION_PRESETS.sheet);

  const loadCompanies = async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    const data = await companiesService.getAdminCompanies();
    if (!isMountedRef.current) return;
    setCompanies(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadCompanies();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return companies.filter((company) => {
      const matchesStatus = status === 'Todos' || company.status === status;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        company.name.toLowerCase().includes(normalizedSearch) ||
        company.managerName.toLowerCase().includes(normalizedSearch) ||
        company.email.toLowerCase().includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [companies, search, status]);

  const openEditModal = (company: AdminCompanyListItem) => {
    setEditingCompany(company);
    setEditingName(company.name);
    setEditingStatus(company.status);
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingCompany) return;
    if (!editingName.trim()) {
      toast.error('Informe o nome da empresa.');
      return;
    }

    setSaving(true);
    const success = await companiesService.updateAdminCompany(editingCompany.id, {
      name: editingName.trim(),
      status: editingStatus,
    });
    setSaving(false);

    if (!success) {
      toast.error('Não foi possível atualizar a empresa.');
      return;
    }

    toast.success('Empresa atualizada com sucesso.');
    setIsEditOpen(false);
    await loadCompanies();
  };

  const handleDelete = (company: AdminCompanyListItem) => {
    Alert.alert('Remover empresa', `Deseja remover ${company.name}? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => void confirmDelete(company.id),
      },
    ]);
  };

  const confirmDelete = async (companyId: string) => {
    setDeletingId(companyId);
    const success = await companiesService.deleteCompany(companyId);
    setDeletingId(null);
    if (!success) {
      toast.error('Não foi possível remover a empresa.');
      return;
    }
    toast.success('Empresa removida com sucesso.');
    await loadCompanies();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        ListHeaderComponent={
          <View className="gap-4">
            <View className="rounded-2xl border border-border bg-surface p-4">
              <Text className="text-xl font-semibold text-white">Empresas / Gestores</Text>
              <Text className="mt-1 text-sm text-text-muted">Controle de organizações, contrato, status e faturamento.</Text>
            </View>

            <View className="gap-3">
              <AdminStatCard title="Total de Empresas" value={`${companies.length}`} icon={Building2} tone="blue" />
              <AdminStatCard title="Ativas" value={`${companies.filter((item) => item.status === 'Ativo').length}`} icon={Building2} tone="green" />
              <AdminStatCard title="Em Risco" value={`${companies.filter((item) => item.status === 'Atraso' || item.status === 'Suspensa').length}`} icon={Building2} tone="red" />
            </View>

            <View className="rounded-2xl border border-border bg-surface p-4">
              <Text className="mb-3 text-base font-semibold text-white">Filtros</Text>
              <View className="gap-3">
                <Select
                  label="Status"
                  value={status}
                  onValueChange={setStatus}
                  options={['Todos', ...statusOptions].map((value) => ({ label: value, value }))}
                />
                <View>
                  <Text className="mb-2 text-sm text-text-secondary">Buscar</Text>
                  <View className="h-12 flex-row items-center rounded-lg border border-border bg-card px-3">
                    <Search size={16} color="#6B7280" />
                    <TextInput
                      className="ml-2 flex-1 text-white"
                      placeholder="Empresa, gestor ou e-mail"
                      placeholderTextColor="#6B7280"
                      value={search}
                      onChangeText={setSearch}
                    />
                  </View>
                </View>
              </View>
            </View>

            <View className="rounded-2xl border border-border bg-surface p-4">
              <Text className="text-base font-semibold text-white">Lista de empresas</Text>
              <Text className="mt-1 text-xs text-text-faint">{filtered.length} registro(s) encontrado(s).</Text>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item: company }) => (
          <Pressable className="rounded-xl border border-border bg-card p-3" onPress={() => router.push(`/(admin)/companies/${company.id}`)}>
            <Text className="text-sm font-semibold text-white">{company.name}</Text>
            <Text className="mt-1 text-xs text-text-muted">Gestor: {company.managerName}</Text>
            <Text className="text-xs text-text-muted">Plano: {company.plan} • Usuários: {company.usersCount}</Text>

            <View className="mt-2 flex-row items-center justify-between">
              <StatusBadge status={company.status} />
              <Text className="text-xs text-text-faint">Próx. cobrança: {company.nextBilling || '-'}</Text>
            </View>

            <View className="mt-3 flex-row gap-2">
              <Pressable
                className="h-9 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-border bg-surface"
                onPress={(event) => {
                  event.stopPropagation();
                  openEditModal(company);
                }}
              >
                <Pencil size={13} color="#D1D5DB" />
                <Text className="text-xs font-semibold text-text-secondary">Editar</Text>
              </Pressable>
              <Pressable
                className="h-9 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-[#7F1D1D] bg-[#2A0F0F]"
                onPress={(event) => {
                  event.stopPropagation();
                  handleDelete(company);
                }}
              >
                {deletingId === company.id ? (
                  <ActivityIndicator size="small" color="#FCA5A5" />
                ) : (
                  <>
                    <Trash2 size={13} color="#FCA5A5" />
                    <Text className="text-xs font-semibold text-[#FCA5A5]">Remover</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <View className="py-8">
              <ActivityIndicator color="#FF6B35" />
              <Text className="mt-2 text-center text-sm text-text-muted">Carregando empresas...</Text>
            </View>
          ) : (
            <View className="rounded-xl border border-border bg-surface p-4">
              <Text className="py-2 text-center text-sm text-text-muted">Nenhuma empresa para os filtros aplicados.</Text>
            </View>
          )
        }
      />

      {shouldRender ? (
        <Modal visible={shouldRender} transparent animationType="none" onRequestClose={() => setIsEditOpen(false)}>
          <Animated.View style={animatedBackdropStyle} className="flex-1 bg-black/80">
            <Animated.View
              style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
              className="flex-1 rounded-t-2xl border border-border bg-surface p-4"
            >
              <Text className="text-lg font-semibold text-white">Editar empresa</Text>

              <View className="mt-4 gap-3">
                <View>
                  <Text className="mb-2 text-sm text-text-secondary">Nome</Text>
                  <TextInput
                    value={editingName}
                    onChangeText={setEditingName}
                    placeholder="Nome da empresa"
                    placeholderTextColor="#6B7280"
                    className="h-12 rounded-xl border border-border bg-card px-3 text-white"
                  />
                </View>

                <Select
                  label="Status"
                  value={editingStatus}
                  onValueChange={(value) => setEditingStatus(value as AdminCompanyListItem['status'])}
                  options={statusOptions.map((value) => ({ label: value, value }))}
                />

                  <Button loading={saving} onPress={() => void handleSave()}>
                  Salvar alterações
                </Button>

                <Button variant="outline" onPress={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
              </View>
            </Animated.View>
          </Animated.View>
        </Modal>
      ) : null}
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
