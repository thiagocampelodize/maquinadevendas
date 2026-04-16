import { DollarSign, X } from 'lucide-react-native';
import { useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';
import { useToastContext } from '@/contexts/ToastContext';
import { salesService } from '@/services/salesService';
import { getBrazilDateString, getRetroactiveStartDate } from '@/utils/dateUtils';
import { formatCurrency, parseCurrency } from '@/utils/masks';

interface SalesPerson {
  id: string;
  name: string;
  goal: number;
}

interface SalesLaunchProps {
  isOpen: boolean;
  onClose: () => void;
  salesTeam: SalesPerson[];
  shift: 'morning' | 'afternoon' | 'evening';
  currentUserId?: string;
  companyId?: string;
  referenceDate: string;
  retroactiveDaysLimit?: number;
}

export function SalesLaunch({ isOpen, onClose, salesTeam, shift, currentUserId, companyId, referenceDate, retroactiveDaysLimit = 30 }: SalesLaunchProps) {
  const insets = useSafeAreaInsets();
  const toast = useToastContext();
  const [entries, setEntries] = useState<Array<{ sellerId: string; sellerName: string; amount: number }>>([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedDate, setSelectedDate] = useState(referenceDate);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(
    isOpen,
    MODAL_ANIMATION_PRESETS.sheet
  );

  if (!shouldRender) return null;

  const total = entries.reduce((sum, item) => sum + item.amount, 0);
  const options = [{ label: 'Selecione o vendedor...', value: '' }, ...salesTeam.map((s) => ({ label: s.name, value: s.id }))];
  const today = getBrazilDateString();
  const minDate = getRetroactiveStartDate(retroactiveDaysLimit);
  const dateOptions = buildDateOptions(minDate, today);

  const shiftToDb = shift === 'evening' ? 'night' : shift;
  const canAdd = Boolean(selectedSeller) && parseCurrency(amount) !== 0;

  const addEntry = () => {
    const numeric = parseCurrency(amount);
    if (!selectedSeller || numeric === 0) return;
    const seller = salesTeam.find((s) => s.id === selectedSeller);
    if (!seller) return;

    setEntries((prev) => [...prev, { sellerId: seller.id, sellerName: seller.name, amount: numeric }]);
    setSelectedSeller('');
    setAmount('');
  };

  const saveEntries = async () => {
    if (!companyId || entries.length === 0) return;
    setSaving(true);

    let saved = 0;
    try {
      for (const entry of entries) {
        const result = await salesService.createSale({
          company_id: companyId,
          seller_id: entry.sellerId,
          created_by: currentUserId,
          value: entry.amount,
          period: shiftToDb,
          sale_date: selectedDate,
        });
        if (result) saved += 1;
      }
    } catch (error) {
      setSaving(false);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar vendas');
      return;
    }

    setSaving(false);

    if (saved === 0) {
      toast.error('Erro ao salvar vendas');
      return;
    }

    toast.success(`${saved} venda(s) salva(s) com sucesso`);
    setEntries([]);
    onClose();
  };

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View className="flex-1 bg-black/70" style={animatedBackdropStyle}>
        <Animated.View
          className="flex-1 rounded-t-2xl border border-border bg-[#0f1117]"
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
        >
          <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
            <View>
              <View className="flex-row items-center gap-2">
                <DollarSign stroke="#FF6B35" size={22} />
                <Text className="text-3xl font-semibold text-white">Lancar Vendas</Text>
              </View>
              <Text className="mt-1 text-sm text-text-muted">
                Turno:{' '}
                {shift === 'morning' ? '🌅 Manha' : shift === 'afternoon' ? '☀️ Tarde' : '🌙 Noite'}
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <X stroke="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
            <View className="rounded-xl border border-[#334155] bg-[#1B263B] p-4">
              <Text className="mb-3 text-2xl font-medium text-white">Adicionar Venda</Text>

              <View className="mb-3">
                <Text className="mb-2 text-sm text-text-secondary">Data de Referencia</Text>
                <Select
                  value={selectedDate}
                  options={dateOptions}
                  onValueChange={setSelectedDate}
                />
                <Text className="mt-2 text-xs text-text-muted">
                  Permitido: hoje e ate {retroactiveDaysLimit} {retroactiveDaysLimit === 1 ? 'dia anterior' : 'dias anteriores'}.
                </Text>
              </View>

              <View className="mb-3">
                <Select value={selectedSeller} options={options} onValueChange={setSelectedSeller} label="Vendedor" />
              </View>

              <View className="mb-3">
                <Text className="mb-2 text-sm text-text-secondary">Valor da Venda</Text>
                <View className="h-12 flex-row items-center rounded-xl border border-[#475569] bg-[#334155] px-3">
                  <Text className="mr-2 text-xl text-text-muted">R$</Text>
                  <TextInput
                    value={amount}
                    onChangeText={(text) => setAmount(formatCurrency(text))}
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor="#6B7280"
                    className="flex-1 text-xl text-[#E5E7EB]"
                  />
                </View>
              </View>

              <Button
                onPress={addEntry}
                disabled={!canAdd}
                className={`${canAdd ? 'bg-[#8B4A36] border-[#8B4A36]' : 'bg-[#8B4A36]/60 border-[#8B4A36]/60'}`}
                textClassName="text-[#E5E7EB]"
              >
                +  Adicionar Venda
              </Button>
            </View>

            <View className="rounded-xl border-2 border-[#FF6B35] bg-[#1B263B] p-4">
              <Text className="text-sm text-text-muted">Total do Turno</Text>
              <Text className="mt-1 text-5xl font-semibold text-[#E5E7EB]">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>

            {entries.map((entry, idx) => (
              <View key={`${entry.sellerId}-${idx}`} className="rounded-lg border border-border bg-card p-3">
                <Text className="text-sm text-white">{entry.sellerName}</Text>
                <Text className={`text-sm ${entry.amount < 0 ? 'text-red-400' : 'text-[#FF6B35]'}`}>
                  {entry.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
            ))}

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  onPress={saveEntries}
                  loading={saving}
                  disabled={entries.length === 0}
                  className="bg-[#8B4A36] border-[#8B4A36]"
                  textClassName="text-[#E5E7EB]"
                >
                  Salvar Vendas
                </Button>
              </View>
              <View className="flex-1">
                <Button variant="outline" onPress={onClose} className="bg-[#334155] border-[#334155]" textClassName="text-[#E5E7EB]">
                  Cancelar
                </Button>
              </View>
            </View>

            <View className="rounded-lg bg-[#1B263B] p-3">
              <Text className="text-sm text-text-muted">
                💡 <Text className="font-semibold">Dica:</Text> Lance as vendas de cada vendedor individualmente. Voce pode adicionar multiplas vendas antes de salvar.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function buildDateOptions(minDate: string, maxDate: string) {
  const options: Array<{ label: string; value: string }> = [];
  const start = new Date(`${minDate}T00:00:00`);
  const end = new Date(`${maxDate}T00:00:00`);

  for (let d = new Date(end); d >= start; d.setDate(d.getDate() - 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`;
    options.push({ label: d.toLocaleDateString('pt-BR'), value: iso });
  }

  return options;
}
