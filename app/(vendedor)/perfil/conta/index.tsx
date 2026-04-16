import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { SubmenuActionsCard } from '@/components/ui/SubmenuActionsCard';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { usersService } from '@/services/usersService';
import { formatPhone } from '@/utils/masks';

export default function VendedorAccountPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const toast = useToastContext();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [storedPassword, setStoredPassword] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const row = await usersService.getUserById(user.id);
      setName(row?.full_name || user.name || '');
      setPhone(formatPhone(row?.phone || ''));
      setEmail(row?.email || user.email || '');
      setAvatar((row?.avatar as string) || '');
      setStoredPassword(String(row?.password_hash || ''));
      setLoading(false);
    };
    void load();
  }, [user?.email, user?.id, user?.name]);

  const initials = useMemo(() => {
    const parts = (name || 'Vendedor').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }, [name]);

  const saveProfile = async () => {
    if (!user?.id) return;
    if (!name.trim()) {
      toast.error('Informe seu nome.');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await usersService.updateUser(user.id, {
        full_name: name.trim(),
        phone: phone.replace(/\D/g, '') || null,
        avatar: avatar.trim() || undefined,
      });
      if (!updated) {
        toast.error('Não foi possível salvar seus dados.');
        return;
      }
      await refreshUser();
      toast.success('Dados atualizados com sucesso!');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!user?.id) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos de senha.');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('A nova senha deve ter ao menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação de senha não confere.');
      return;
    }
    if (storedPassword && currentPassword !== storedPassword && currentPassword.trim() !== storedPassword) {
      toast.error('Senha atual incorreta.');
      return;
    }

    setSavingPassword(true);
    try {
      const updated = await usersService.updateUser(user.id, { password_hash: newPassword });
      if (!updated) {
        toast.error('Não foi possível atualizar sua senha.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStoredPassword(newPassword);
      toast.success('Senha atualizada com sucesso!');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
          <SubmenuHeaderCard
            onBack={() => router.replace('/(vendedor)/perfil')}
            title="Minha conta"
            subtitle="Atualize seus dados pessoais e credenciais de acesso."
          />
          <SubmenuActionsCard>
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text className="text-sm text-text-muted">Carregando conta...</Text>
            </View>
          </SubmenuActionsCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.replace('/(vendedor)/perfil')}
          title="Minha conta"
          subtitle="Atualize seus dados pessoais e credenciais de acesso."
        />

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-3 text-base font-semibold text-white">Identidade</Text>
          <View className="mb-3 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#FF6B35]">
              <Text className="text-base font-bold text-white">{initials}</Text>
            </View>
            <View>
              <Text className="text-sm text-text-secondary">Avatar textual</Text>
              <Text className="text-xs text-text-muted">Use a URL abaixo se quiser foto personalizada.</Text>
            </View>
          </View>

          <Field label="Nome">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor="#6B7280"
              className="h-12 rounded-xl border border-border bg-card px-3 text-white"
            />
          </Field>

          <Field label="Telefone">
            <TextInput
              value={phone}
              onChangeText={(value) => setPhone(formatPhone(value))}
              keyboardType="phone-pad"
              placeholder="(00) 00000-0000"
              placeholderTextColor="#6B7280"
              className="h-12 rounded-xl border border-border bg-card px-3 text-white"
            />
          </Field>

          <Field label="Email">
            <TextInput
              value={email}
              editable={false}
              placeholderTextColor="#6B7280"
              className="h-12 rounded-xl border border-border bg-surface px-3 text-text-muted"
            />
          </Field>

          <Field label="URL do avatar (opcional)">
            <TextInput
              value={avatar}
              onChangeText={setAvatar}
              placeholder="https://..."
              placeholderTextColor="#6B7280"
              className="h-12 rounded-xl border border-border bg-card px-3 text-white"
            />
          </Field>

          <Button className="h-12 rounded-xl" onPress={() => void saveProfile()} loading={savingProfile}>
            Salvar dados
          </Button>
        </View>

        <SubmenuActionsCard>
          <Text className="mb-3 text-base font-semibold text-white">Trocar senha</Text>
          <PasswordField
            label="Senha atual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            visible={showCurrent}
            onToggleVisibility={() => setShowCurrent((v) => !v)}
          />
          <PasswordField
            label="Nova senha"
            value={newPassword}
            onChangeText={setNewPassword}
            visible={showNew}
            onToggleVisibility={() => setShowNew((v) => !v)}
          />
          <PasswordField
            label="Confirmar nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            visible={showConfirm}
            onToggleVisibility={() => setShowConfirm((v) => !v)}
          />

          <Button className="mt-2 h-12 rounded-xl" onPress={() => void savePassword()} loading={savingPassword}>
            Atualizar senha
          </Button>
        </SubmenuActionsCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-3">
      <Text className="mb-2 text-sm text-text-secondary">{label}</Text>
      {children}
    </View>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-2 text-sm text-text-secondary">{label}</Text>
      <View className="h-12 flex-row items-center rounded-xl border border-border bg-card px-3">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder="******"
          placeholderTextColor="#6B7280"
          className="flex-1 text-white"
        />
        <Pressable onPress={onToggleVisibility}>
          {visible ? <EyeOff size={16} color="#9CA3AF" /> : <Eye size={16} color="#9CA3AF" />}
        </Pressable>
      </View>
    </View>
  );
}
