import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Trash2, User2, UserPlus, Users } from 'lucide-react-native';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';
import { useToastContext } from '@/contexts/ToastContext';
import { companiesService, type AdminCompanyListItem } from '@/services/companiesService';
import { usersService, type AdminUserListItem } from '@/services/usersService';
import type { UserRole } from '@/types';

const roleOptions: UserRole[] = ['ADMIN', 'GESTOR', 'VENDEDOR'];

export default function UsersManagementPage() {
  const toast = useToastContext();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [companies, setCompanies] = useState<AdminCompanyListItem[]>([]);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('Todos');
  const [status, setStatus] = useState('Todos');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('VENDEDOR');
  const [selectedStatus, setSelectedStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const isMountedRef = useRef(true);

  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(isModalOpen, MODAL_ANIMATION_PRESETS.sheet);

  const loadData = async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    const [usersData, companiesData] = await Promise.all([usersService.getAdminUsers(), companiesService.getAdminCompanies()]);
    if (!isMountedRef.current) return;
    setUsers(usersData);
    setCompanies(companiesData);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return users.filter((user) => {
      const roleMatches = role === 'Todos' || roleLabel(user.role) === role;
      const statusMatches = status === 'Todos' || user.status === status;
      const searchMatches =
        normalized.length === 0 ||
        user.name.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized) ||
        user.company.toLowerCase().includes(normalized);
      return roleMatches && statusMatches && searchMatches;
    });
  }, [role, search, status, users]);

  const openNewModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setSelectedRole('VENDEDOR');
    setSelectedStatus('Ativo');
    setSelectedCompanyId(companies[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (user: AdminUserListItem) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setSelectedRole(user.role);
    setSelectedStatus(user.status);
    setSelectedCompanyId(user.companyId || companies[0]?.id || '');
    setIsModalOpen(true);
  };

  const saveUser = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome do usuario.');
      return;
    }

    if (!email.trim()) {
      toast.error('Informe o email do usuario.');
      return;
    }

    if (selectedRole !== 'ADMIN' && !selectedCompanyId) {
      toast.error('Selecione a empresa para este perfil.');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const updated = await usersService.updateUser(editingUser.id, {
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          role: selectedRole,
          company_id: selectedRole === 'ADMIN' ? null : selectedCompanyId,
          active: selectedStatus === 'Ativo',
        });
        if (!updated) {
      toast.error('Não foi possível atualizar o usuário.');
          return;
        }
        toast.success('Usuário atualizado com sucesso.');
      } else {
        const created = await usersService.createUser({
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          role: selectedRole,
          company_id: selectedRole === 'ADMIN' ? null : selectedCompanyId,
          active: selectedStatus === 'Ativo',
          password_hash: '123456',
        });
        if (!created) {
          toast.error('Não foi possível criar o usuário.');
          return;
        }
        toast.success('Usuário criado com sucesso.');
      }

      setIsModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (user: AdminUserListItem) => {
    const updated = await usersService.updateUser(user.id, { active: user.status !== 'Ativo' });
    if (!updated) {
      toast.error('Não foi possível alterar o status do usuário.');
      return;
    }
    toast.success(user.status === 'Ativo' ? 'Usuário inativado.' : 'Usuário ativado.');
    await loadData();
  };

  const askDelete = (user: AdminUserListItem) => {
    Alert.alert('Remover usuário', `Deseja remover ${user.name}? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => void confirmDelete(user.id),
      },
    ]);
  };

  const confirmDelete = async (id: string) => {
    setDeletingId(id);
    const success = await usersService.deleteUser(id);
    setDeletingId(null);
    if (!success) {
      toast.error('Não foi possível remover o usuário.');
      return;
    }
    toast.success('Usuário removido com sucesso.');
    await loadData();
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
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
            <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xl font-semibold text-white">Gerenciar Usuários</Text>
                  <Text className="mt-1 text-sm text-[#9CA3AF]">Controle de perfis administrativos, gestores e vendedores.</Text>
                </View>
                <Pressable className="h-10 flex-row items-center gap-2 rounded-xl bg-[#FF6B35] px-3" onPress={openNewModal}>
                  <UserPlus size={14} color="#FFFFFF" />
                  <Text className="text-sm font-semibold text-white">Novo</Text>
                </Pressable>
              </View>
            </View>

            <View className="gap-3">
              <AdminStatCard title="Total" value={`${users.length}`} icon={Users} tone="gray" />
              <AdminStatCard title="Admin" value={`${users.filter((item) => item.role === 'ADMIN').length}`} icon={User2} tone="blue" />
              <AdminStatCard title="Gestor" value={`${users.filter((item) => item.role === 'GESTOR').length}`} icon={User2} tone="orange" />
              <AdminStatCard title="Vendedor" value={`${users.filter((item) => item.role === 'VENDEDOR').length}`} icon={User2} tone="green" />
            </View>

            <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
              <Text className="mb-3 text-base font-semibold text-white">Filtros</Text>
              <View className="gap-3">
                <Select
                  label="Perfil"
                  value={role}
                  onValueChange={setRole}
                  options={['Todos', 'Admin', 'Gestor', 'Vendedor'].map((value) => ({ label: value, value }))}
                />
                <Select
                  label="Status"
                  value={status}
                  onValueChange={setStatus}
                  options={['Todos', 'Ativo', 'Inativo'].map((value) => ({ label: value, value }))}
                />
                <View>
                  <Text className="mb-2 text-sm text-[#D1D5DB]">Buscar</Text>
                  <View className="h-12 flex-row items-center rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] px-3">
                    <Search size={16} color="#6B7280" />
                    <TextInput
                      className="ml-2 flex-1 text-white"
                      placeholder="Nome, email ou empresa"
                      placeholderTextColor="#6B7280"
                      value={search}
                      onChangeText={setSearch}
                    />
                  </View>
                </View>
              </View>
            </View>

            <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
              <Text className="text-base font-semibold text-white">Usuários</Text>
              <Text className="mt-1 text-xs text-[#6B7280]">{filtered.length} registro(s) encontrado(s).</Text>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item: user }) => (
          <View className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-3">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#FF6B35]">
                <Text className="text-xs font-bold text-white">{initialsFromName(user.name)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white">{user.name}</Text>
                <Text className="text-xs text-[#9CA3AF]">{user.email}</Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-xs text-[#9CA3AF]">{user.company}</Text>
              <Text className="text-xs font-semibold text-[#FF6B35]">{roleLabel(user.role)}</Text>
              <Text className={`text-xs font-semibold ${user.status === 'Ativo' ? 'text-[#34D399]' : 'text-[#9CA3AF]'}`}>{user.status}</Text>
            </View>

            <View className="mt-3 flex-row gap-2">
              <Pressable className="h-9 flex-1 items-center justify-center rounded-lg border border-[#2D2D2D] bg-[#111111]" onPress={() => openEditModal(user)}>
                <Text className="text-xs font-semibold text-[#D1D5DB]">Editar</Text>
              </Pressable>
              <Pressable
                className={`h-9 flex-1 items-center justify-center rounded-lg border ${user.status === 'Ativo' ? 'border-red-900 bg-[#2A0F0F]' : 'border-green-900 bg-[#0F2A16]'}`}
                onPress={() => void toggleUser(user)}
              >
                <Text className={`text-xs font-semibold ${user.status === 'Ativo' ? 'text-red-300' : 'text-green-300'}`}>
                  {user.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                </Text>
              </Pressable>
              <Pressable
                className="h-9 w-11 items-center justify-center rounded-lg border border-[#7F1D1D] bg-[#2A0F0F]"
                onPress={() => askDelete(user)}
              >
                {deletingId === user.id ? <ActivityIndicator size="small" color="#FCA5A5" /> : <Trash2 size={13} color="#FCA5A5" />}
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View className="py-8">
              <ActivityIndicator color="#FF6B35" />
              <Text className="mt-2 text-center text-sm text-[#9CA3AF]">Carregando usuários...</Text>
            </View>
          ) : (
            <View className="rounded-xl border border-[#2D2D2D] bg-[#111111] p-4">
              <Text className="text-center text-sm text-[#9CA3AF]">Nenhum usuário encontrado para os filtros.</Text>
            </View>
          )
        }
      />

      {shouldRender ? (
        <Modal visible={shouldRender} transparent animationType="none" onRequestClose={() => setIsModalOpen(false)}>
          <Animated.View style={animatedBackdropStyle} className="flex-1 bg-black/80">
            <Animated.View
              style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
              className="flex-1 rounded-t-2xl border border-[#2D2D2D] bg-[#111111] p-4"
            >
              <Text className="text-lg font-semibold text-white">{editingUser ? 'Editar usuário' : 'Novo usuário'}</Text>

              <ScrollView className="mt-4 flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
                <Field label="Nome">
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Nome completo"
                    placeholderTextColor="#6B7280"
                    className="h-12 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
                  />
                </Field>

                <Field label="Email">
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="email@dominio.com"
                    placeholderTextColor="#6B7280"
                    className="h-12 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
                  />
                </Field>

                <Select
                  label="Perfil"
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as UserRole)}
                  options={roleOptions.map((value) => ({ label: roleLabel(value), value }))}
                />

                <Select
                  label="Status"
                  value={selectedStatus}
                  onValueChange={(value) => setSelectedStatus(value as 'Ativo' | 'Inativo')}
                  options={['Ativo', 'Inativo'].map((value) => ({ label: value, value }))}
                />

                {selectedRole !== 'ADMIN' ? (
                  <Select
                    label="Empresa"
                    value={selectedCompanyId}
                    onValueChange={setSelectedCompanyId}
                    options={companies.map((company) => ({ label: company.name, value: company.id }))}
                    placeholder="Selecione a empresa"
                  />
                ) : null}

                <Button loading={saving} onPress={() => void saveUser()}>
                  {editingUser ? 'Salvar alterações' : 'Criar usuário'}
                </Button>

                <Button variant="outline" onPress={() => setIsModalOpen(false)}>
                  Cancelar
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

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function roleLabel(role: UserRole): string {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'GESTOR') return 'Gestor';
  return 'Vendedor';
}
