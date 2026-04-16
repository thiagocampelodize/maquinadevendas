import { AlertTriangle } from 'lucide-react-native';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';

interface DeleteSaleConfirmModalProps {
  isOpen: boolean;
  sellerName: string;
  saleAmount: number;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteSaleConfirmModal({
  isOpen,
  sellerName,
  saleAmount,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteSaleConfirmModalProps) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(
    isOpen,
    MODAL_ANIMATION_PRESETS.dialog
  );
  if (!shouldRender) return null;

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={animatedBackdropStyle} className="flex-1">
        <Pressable className="flex-1 items-center justify-center bg-black/70 px-4" onPress={onClose}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View
              className="w-full rounded-2xl border border-border bg-surface p-5"
              style={[{ marginTop: Math.max(insets.top, 8), marginBottom: Math.max(insets.bottom, 8), maxWidth: 480 }, animatedContentStyle]}
            >
          <View className="mb-4 flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
              <AlertTriangle stroke="#EF4444" size={18} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">Confirmar exclusao</Text>
              <Text className="mt-2 text-sm text-text-secondary">
                Excluir o lancamento de {saleAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de{' '}
                {sellerName}?
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button variant="outline" onPress={onClose} disabled={isLoading}>
                Cancelar
              </Button>
            </View>
            <View className="flex-1">
              <Button variant="destructive" onPress={onConfirm} loading={isLoading}>
                Excluir
              </Button>
            </View>
          </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
