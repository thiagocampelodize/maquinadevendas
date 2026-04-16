import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SubmenuHeaderCard } from '@/components/ui/SubmenuHeaderCard';
import { useToastContext } from '@/contexts/ToastContext';
import { adminService, type TempAccessRow } from '@/services/adminService';

export default function TempAccessManagementPage() {
  const router = useRouter();
  const toast = useToastContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accesses, setAccesses] = useState<TempAccessRow[]>([]);
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'GESTOR' | 'VENDEDOR'>('GESTOR');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const loadAccesses = async () => {
    setLoading(true);
    const data = await adminService.getTempAccesses();
    setAccesses(data);
    setLoading(false);
  };

  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    setExpiresAt(date.toISOString().substring(0, 10));
    void loadAccesses();
  }, []);

  const counts = useMemo(
    () => ({
      active: accesses.filter((item) => item.status === 'Ativo').length,
      expired: accesses.filter((item) => item.status === 'Expirado').length,
      revoked: accesses.filter((item) => item.status === 'Revogado').length,
    }),
    [accesses],
  );

  const handleCreate = async () => {
    if (!email.trim()) {
      toast.error('Informe o email.');
      return;
    }
    if (!description.trim()) {
      toast.error('Informe a descricao do acesso.');
      return;
    }
    if (!expiresAt.trim()) {
      toast.error('Informe a data de expiração.');
      return;
    }

    setSaving(true);
    const success = await adminService.createTempAccess({
      email: email.trim().toLowerCase(),
      type,
      description: description.trim(),
      expiresAt: `${expiresAt}T23:59:59`,
    });
    setSaving(false);

    if (!success) {
      toast.error('Não foi possível conceder o acesso.');
      return;
    }

    toast.success('Acesso temporário concedido.');
    setEmail('');
    setDescription('');
    await loadAccesses();
  };

  const handleRevoke = async (id: string) => {
    const success = await adminService.revokeTempAccess(id);
    if (!success) {
      toast.error('Não foi possível revogar o acesso.');
      return;
    }
    toast.success('Acesso revogado.');
    await loadAccesses();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <SubmenuHeaderCard
          onBack={() => router.navigate('/(admin)/mais')}
          title="Acessos Temporários"
          subtitle="Conceda ou revogue acessos emergenciais por tempo limitado."
        />

        <View className="rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row gap-2">
            <Badge text={`Ativos: ${counts.active}`} color="#34D399" bg="#153A2E" />
            <Badge text={`Expirados: ${counts.expired}`} color="#F59E0B" bg="#3D2C0F" />
            <Badge text={`Revogados: ${counts.revoked}`} color="#9CA3AF" bg="#1F2937" />
          </View>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-3 text-base font-semibold text-white">Conceder acesso</Text>
          <View className="gap-3">
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="usuario@dominio.com" />
            <Select
              label="Tipo"
              value={type}
              onValueChange={(value) => setType(value as 'GESTOR' | 'VENDEDOR')}
              options={[
                { label: 'GESTOR', value: 'GESTOR' },
                { label: 'VENDEDOR', value: 'VENDEDOR' },
              ]}
            />
            <Field label="Descrição" value={description} onChangeText={setDescription} placeholder="Motivo da liberação" />
            <Field label="Expira em (YYYY-MM-DD)" value={expiresAt} onChangeText={setExpiresAt} placeholder="2026-03-10" />
            <Button loading={saving} onPress={() => void handleCreate()}>
              Conceder acesso
            </Button>
          </View>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-base font-semibold text-white">Acessos registrados</Text>
          {loading ? (
            <View className="py-8">
              <ActivityIndicator color="#FF6B35" />
              <Text className="mt-2 text-center text-sm text-text-muted">Carregando acessos...</Text>
            </View>
          ) : (
            <View className="mt-3 gap-2">
              {accesses.map((access) => (
                <View key={access.id} className="rounded-xl border border-border bg-card p-3">
                  <Text className="text-sm font-semibold text-white">{access.email}</Text>
                  <Text className="mt-1 text-xs text-text-muted">{access.type} • {access.description}</Text>
                  <Text className="text-xs text-text-muted">Expira em: {new Date(access.expires_at).toLocaleString('pt-BR')}</Text>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className={`text-xs font-semibold ${access.status === 'Ativo' ? 'text-[#34D399]' : access.status === 'Expirado' ? 'text-[#F59E0B]' : 'text-text-muted'}`}>
                      {access.status}
                    </Text>
                    {access.status === 'Ativo' ? (
                      <Pressable className="rounded-md border border-[#7F1D1D] bg-[#2A0F0F] px-2 py-1" onPress={() => void handleRevoke(access.id)}>
                        <Text className="text-xs font-semibold text-[#FCA5A5]">Revogar</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <View className="rounded-md px-2 py-1" style={{ backgroundColor: bg }}>
      <Text className="text-xs font-semibold" style={{ color }}>
        {text}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View>
      <Text className="mb-2 text-sm text-text-secondary">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        autoCapitalize="none"
        className="h-12 rounded-xl border border-border bg-card px-3 text-white"
      />
    </View>
  );
}
