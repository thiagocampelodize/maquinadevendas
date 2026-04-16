import { DollarSign, FileText, Package, User, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';
import { useToastContext } from '@/contexts/ToastContext';
import { salesService, type Sale, type SaleInput } from '@/services/salesService';
import { formatCurrency, parseCurrency } from '@/utils/masks';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  userId: string;
  onSaved: () => void;
}

export function EditSaleModal({ isOpen, onClose, sale, userId, onSaved }: EditSaleModalProps) {
  const insets = useSafeAreaInsets();
  const toast = useToastContext();
  const [value, setValue] = useState('');
  const [client, setClient] = useState('');
  const [product, setProduct] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(
    isOpen,
    MODAL_ANIMATION_PRESETS.sheet
  );

  useEffect(() => {
    if (!sale) return;
    setValue(formatCurrency(String(Math.round(sale.value * 100))));
    setClient(sale.client || '');
    setProduct(sale.product || '');
    setNotes(sale.notes || '');
  }, [sale]);

  if (!shouldRender) return null;

  const handleSave = async () => {
    const numericValue = parseCurrency(value);
    if (numericValue === 0) {
      toast.error('O valor nao pode ser zero');
      return;
    }

    setIsSaving(true);
    const updates: Partial<SaleInput> = {
      value: numericValue,
      client: client || undefined,
      product: product || undefined,
      notes: notes || undefined,
    };

    const result = await salesService.updateSaleWithAudit(sale.id, updates, userId);
    setIsSaving(false);

    if (!result) {
      toast.error('Erro ao atualizar venda');
      return;
    }

    toast.success('Venda atualizada com sucesso!');
    onSaved();
    onClose();
  };

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View className="flex-1 bg-black/70" style={animatedBackdropStyle}>
        <Animated.View
          className="flex-1 rounded-t-2xl border border-border bg-surface"
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
        >
          <View className="flex-row items-center justify-between border-b border-border p-4">
            <View className="flex-row items-center gap-2">
              <DollarSign stroke="#FF6B35" size={20} />
              <Text className="text-lg font-semibold text-white">Editar Venda</Text>
            </View>
            <Pressable onPress={onClose}>
              <X stroke="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <View className="p-4">
            <Field label="Valor da Venda *" icon={<DollarSign stroke="#9CA3AF" size={14} />}>
              <TextInput
                value={value}
                onChangeText={(text) => setValue(formatCurrency(text))}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor="#6B7280"
                className="rounded-lg border border-border bg-card px-3 py-3 text-white"
              />
            </Field>

            <Field label="Cliente" icon={<User stroke="#9CA3AF" size={14} />}>
              <TextInput
                value={client}
                onChangeText={setClient}
                placeholder="Nome do cliente"
                placeholderTextColor="#6B7280"
                className="rounded-lg border border-border bg-card px-3 py-3 text-white"
              />
            </Field>

            <Field label="Produto" icon={<Package stroke="#9CA3AF" size={14} />}>
              <TextInput
                value={product}
                onChangeText={setProduct}
                placeholder="Produto vendido"
                placeholderTextColor="#6B7280"
                className="rounded-lg border border-border bg-card px-3 py-3 text-white"
              />
            </Field>

            <Field label="Observacoes" icon={<FileText stroke="#9CA3AF" size={14} />}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Observacoes"
                placeholderTextColor="#6B7280"
                className="min-h-[100px] rounded-lg border border-border bg-card px-3 py-3 text-white"
              />
            </Field>

            <View className="mt-2 flex-row gap-2">
              <View className="flex-1">
                <Button onPress={handleSave} loading={isSaving}>
                  Salvar Alteracoes
                </Button>
              </View>
              <View className="flex-1">
                <Button variant="outline" onPress={onClose} disabled={isSaving}>
                  Cancelar
                </Button>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View className="mb-3">
      <View className="mb-2 flex-row items-center gap-1">
        {icon}
        <Text className="text-sm text-text-secondary">{label}</Text>
      </View>
      {children}
    </View>
  );
}
