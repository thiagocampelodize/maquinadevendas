import { BarChart3, MessageCircle, Send } from 'lucide-react-native';
import { Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface HomeQuickActionsProps {
  isStartingTask: boolean;
  currentHour: number;
  onStartTask: () => void;
  onShowMessages: () => void;
  onShowAdherence: () => void;
  onShowGlobalMessage: () => void;
  onShowForecastAudit: () => void;
}

export function HomeQuickActions({
  isStartingTask,
  currentHour,
  onStartTask,
  onShowMessages,
  onShowAdherence,
  onShowGlobalMessage,
  onShowForecastAudit,
}: HomeQuickActionsProps) {
  return (
    <View className="gap-4">
      <Card style={{ backgroundColor: '#FF6B35', borderColor: '#FF6B35' }}>
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-white">Proxima Tarefa</Text>
          <Button className='bg-white' textStyle={{ color: '#FF6B35' }} size="sm" loading={isStartingTask} onPress={onStartTask}>
            {isStartingTask ? 'Iniciando...' : 'Iniciar'}
          </Button>
        </View>
        <Text className="text-sm text-white/90">
          {currentHour < 12
            ? '☀️ Checklist da Manha - Abertura'
            : currentHour < 17
              ? '🌤️ Checklist do Meio-dia - Acompanhamento'
              : '🌙 Checklist da Noite - Fechamento'}
        </Text>
      </Card>

      <ActionCard
        title="Adesao ao Metodo"
        subtitle="Veja heatmap de execucao das tarefas OMC nos ultimos 7 dias."
        icon={<BarChart3 stroke="#FF6B35" size={18} />}
        buttonText="Ver Relatorio Completo"
        onPress={onShowAdherence}
      />

      <ActionCard
        title="Enviar Mensagem"
        subtitle="Envie mensagens via notificacao para qualquer vendedor."
        icon={<Send stroke="#16A34A" size={18} />}
        buttonText="Enviar Agora"
        buttonColor="#16A34A"
        onPress={onShowGlobalMessage}
      />

      <ActionCard
        title="Mensagens WhatsApp"
        subtitle="Copie mensagens prontas para motivar sua equipe."
        icon={<MessageCircle stroke="#FF6B35" size={18} />}
        buttonText="Acessar Biblioteca"
        onPress={onShowMessages}
      />

      <ActionCard
        title="Auditoria Previsao"
        subtitle="Veja o calculo detalhado da previsao por vendedor e consolidado do time."
        icon={<BarChart3 stroke="#2563EB" size={18} />}
        buttonText="Abrir Auditoria"
        onPress={onShowForecastAudit}
      />
    </View>
  );
}

function ActionCard({
  title,
  subtitle,
  icon,
  buttonText,
  buttonColor,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  buttonText: string;
  buttonColor?: string;
  onPress: () => void;
}) {
  return (
    <Card>
      <View className="mb-4 flex-row items-center gap-3">
        <View className="rounded-lg bg-[#262626] p-2">{icon}</View>
        <Text className="text-lg font-semibold text-white">{title}</Text>
      </View>
      <Text className="mb-4 text-sm text-[#9CA3AF]">{subtitle}</Text>
      <Button variant="outline" onPress={onPress} style={{ backgroundColor: buttonColor }}>
        {buttonText}
      </Button>
    </Card>
  );
}
