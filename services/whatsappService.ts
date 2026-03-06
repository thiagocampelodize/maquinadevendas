import { supabase } from '@/lib/supabase';

export interface WhatsAppPayload {
  turno_msg: 'manha' | 'tarde' | 'noite';
  horario_msg: string;
  numero_telefone: string;
  mensagem_texto: string;
}

export const whatsappService = {
  async sendMessage(payload: WhatsAppPayload): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp-message', { body: payload });
      return !error;
    } catch {
      return false;
    }
  },

  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('55')) return `+${cleaned}`;
    return `+55${cleaned}`;
  },

  getTurno(): 'manha' | 'tarde' | 'noite' {
    const hour = new Date().getHours();
    if (hour < 12) return 'manha';
    if (hour < 18) return 'tarde';
    return 'noite';
  },

  getHorarioAtual(): string {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },
};
