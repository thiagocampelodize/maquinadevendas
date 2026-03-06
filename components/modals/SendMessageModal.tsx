import * as Clipboard from 'expo-clipboard';
import { Check, Copy, Send, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';
import { useToastContext } from '@/contexts/ToastContext';
import { messageTemplatesService, type MessageTemplate } from '@/services/messageTemplatesService';
import { notificationsService } from '@/services/notificationsService';

interface SellerInfo {
  id: string;
  name: string;
  sales: number;
  goal: number;
  salesToday?: number;
  phone?: string;
}

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller: SellerInfo;
  companyId?: string;
}

export function SendMessageModal({ isOpen, onClose, seller, companyId }: SendMessageModalProps) {
  const insets = useSafeAreaInsets();
  const { shouldRender, animatedBackdropStyle, animatedContentStyle } = useModalAnimation(
    isOpen,
    MODAL_ANIMATION_PRESETS.sheet
  );
  const toast = useToastContext();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setIsLoading(true);
      const data = await messageTemplatesService.getTemplates(companyId);
      setTemplates(data);
      if (data[0]) setSelectedTemplateId(data[0].id);
      setIsLoading(false);
    };
    void load();
  }, [companyId, isOpen]);

  const categories = [
    { value: 'all', label: 'Todas' },
    { value: 'cobranca', label: 'Cobranca' },
    { value: 'parabens', label: 'Parabens' },
    { value: 'fechamento', label: 'Fechamento' },
    { value: 'lembrete', label: 'Lembrete' },
    { value: 'feedback_quinzena', label: 'Feedback Quinzena' },
    { value: 'abertura_fechamento_mes', label: 'Abertura/Fechamento Mes' },
    { value: 'rotina_diaria', label: 'Rotina Diaria' },
    { value: 'custom', label: 'Personalizado' },
  ];

  const filteredTemplates = useMemo(
    () => (selectedCategory === 'all' ? templates : templates.filter((t) => t.category === selectedCategory)),
    [selectedCategory, templates]
  );

  const selectedTemplate = filteredTemplates.find((t) => t.id === selectedTemplateId) || null;
  const variables = messageTemplatesService.generateVariablesForSeller({
    name: seller.name,
    sales: seller.sales,
    goal: seller.goal,
    salesToday: seller.salesToday,
  });
  const renderedMessage = selectedTemplate
    ? messageTemplatesService.renderMessage(selectedTemplate.content, variables)
    : customMessage;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(renderedMessage);
      setCopied(true);
      toast.success('Mensagem copiada!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleSendAsNotification = async () => {
    if (!renderedMessage.trim()) {
      toast.error('Mensagem vazia');
      return;
    }
    if (!companyId) {
      toast.error('Empresa nao identificada para envio de notificacao.');
      return;
    }

    setIsSending(true);
    try {
      const notification = await notificationsService.createNotificationForCompany(companyId, {
        user_id: seller.id,
        type: 'general',
        title: 'Mensagem do Gestor',
        message: renderedMessage,
      });

      if (!notification) {
        toast.error('Envio bloqueado: destinatario fora da empresa.');
        return;
      }

      toast.success('Mensagem enviada!');
      onClose();
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal visible={shouldRender} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View className="flex-1 bg-black/80" style={animatedBackdropStyle}>
        <Animated.View
          className="flex-1 rounded-t-2xl border border-[#2D2D2D] bg-[#111111]"
          style={[{ marginTop: Math.max(insets.top + 8, 40), paddingBottom: Math.max(insets.bottom, 8) }, animatedContentStyle]}
        >
          <View className="flex-row items-center justify-between border-b border-[#2D2D2D] p-4">
            <Text className="text-lg font-semibold text-white">Mensagem para {seller.name}</Text>
            <Pressable onPress={onClose}>
              <X stroke="#FFFFFF" size={20} />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
            {isLoading ? <Text className="text-[#9CA3AF]">Carregando templates...</Text> : null}

            {!isLoading ? (
              <>
                <View>
                  <Select
                    label="Categoria"
                    value={selectedCategory}
                    options={categories}
                    onValueChange={(value) => {
                      setSelectedCategory(value);
                      setSelectedTemplateId('');
                    }}
                  />
                </View>

                <View>
                  <Select
                    label="Template"
                    value={selectedTemplateId}
                    options={[
                      { label: 'Selecione...', value: '' },
                      ...filteredTemplates.map((template) => ({ label: template.name, value: template.id })),
                    ]}
                    onValueChange={setSelectedTemplateId}
                  />
                </View>

                {!selectedTemplate ? (
                  <View>
                    <Text className="mb-2 text-sm text-[#D1D5DB]">Mensagem Personalizada</Text>
                    <TextInput
                      multiline
                      value={customMessage}
                      onChangeText={setCustomMessage}
                      className="min-h-[120px] rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] p-3 text-white"
                      placeholder="Digite sua mensagem..."
                      placeholderTextColor="#6B7280"
                    />
                  </View>
                ) : null}

                <View>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm text-[#D1D5DB]">Preview</Text>
                    <Pressable className="flex-row items-center gap-1" onPress={handleCopy}>
                      {copied ? <Check stroke="#22C55E" size={14} /> : <Copy stroke="#9CA3AF" size={14} />}
                      <Text className="text-xs text-[#9CA3AF]">{copied ? 'Copiado!' : 'Copiar'}</Text>
                    </Pressable>
                  </View>
                  <View className="min-h-[140px] rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] p-3">
                    <Text className="text-sm leading-6 text-white">{renderedMessage || 'Selecione um template'}</Text>
                  </View>
                </View>

                <View className="rounded-lg bg-[#1A1A1A] p-2">
                  <Text className="text-xs text-[#9CA3AF]">
                    <Text className="font-semibold">Dados do vendedor:</Text> {seller.name} • Meta: R${' '}
                    {seller.goal.toLocaleString('pt-BR')} • Vendido: R$ {seller.sales.toLocaleString('pt-BR')}
                  </Text>
                </View>

                <Button loading={isSending} onPress={handleSendAsNotification}>
                  {isSending ? 'Enviando...' : 'Notificacao'}
                </Button>
              </>
            ) : null}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
