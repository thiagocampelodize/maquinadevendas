import { calculateLinearProjection, getBrazilMonthProgress } from '@/domain/forecast/forecastCalculator';
import { supabase } from '@/lib/supabase';
import { getBrazilDate } from '@/utils/dateUtils';

export interface MessageTemplate {
  id: string;
  company_id: string | null;
  name: string;
  category:
    | 'cobranca'
    | 'parabens'
    | 'fechamento'
    | 'lembrete'
    | 'custom'
    | 'feedback_quinzena'
    | 'abertura_fechamento_mes'
    | 'rotina_diaria';
  content: string;
  variables: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageVariables {
  [key: string]: string | number | undefined;
}

export const messageTemplatesService = {
  async getTemplates(companyId?: string): Promise<MessageTemplate[]> {
    let query = supabase
      .from('message_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (companyId) {
      query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
    } else {
      query = query.is('company_id', null);
    }

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  },

  renderMessage(template: string, variables: MessageVariables): string {
    let rendered = template;
    const quantityIndicators = ['qtd', 'quantidade', 'numero', 'posicao', 'progresso'];
    const monetaryIndicators = ['meta', 'vendido', 'falta', 'projecao', 'diferenca', 'total', 'valor', 'previsto', 'recebido', 'aberto'];

    Object.entries(variables).forEach(([key, value]) => {
      if (value === undefined) return;
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      if (typeof value === 'number') {
        const isQuantity = quantityIndicators.some((ind) => key.includes(ind));
        const isMonetary = monetaryIndicators.some((ind) => key.includes(ind)) && !isQuantity;
        const formatted = isQuantity
          ? value.toLocaleString('pt-BR')
          : isMonetary
            ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : value.toLocaleString('pt-BR');
        rendered = rendered.replace(placeholder, formatted);
      } else {
        rendered = rendered.replace(placeholder, String(value));
      }
    });

    return rendered.replace(/\{[\w]+\}/g, '').trim();
  },

  generateVariablesForSeller(
    seller: { name: string; sales: number; goal: number; salesToday?: number; projection?: number },
    context?: {
      dailyRanking?: Array<{ name: string; value: number }>;
      monthlyRanking?: Array<{ name: string; value: number }>;
      totalDailySales?: number;
      totalMonthlySales?: number;
      dailyGoal?: number;
      monthlyGoal?: number;
      sellersMetDailyGoal?: string[];
      sellersBelowThreshold?: number;
    }
  ): MessageVariables {
    const today = getBrazilDate();
    const { daysInMonth, daysElapsed } = getBrazilMonthProgress(today);
    const currentDay = daysElapsed;
    const diasRestantes = daysInMonth - currentDay;
    const faltaVender = Math.max(0, seller.goal - seller.sales);
    const percentual = seller.goal > 0 ? (seller.sales / seller.goal) * 100 : 0;
    const metaBatida = seller.sales >= seller.goal;
    const hour = today.getHours();
    const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const projectedByRule = calculateLinearProjection(seller.sales, currentDay, daysInMonth).projection;
    const diferenca = (seller.projection || projectedByRule) - seller.goal;

    const vars: MessageVariables = {
      nome: seller.name,
      meta: seller.goal,
      vendido: seller.sales,
      falta_vender: faltaVender,
      vendido_hoje: seller.salesToday || 0,
      projecao: seller.projection || projectedByRule,
      diferenca: Math.abs(diferenca),
      saudacao_temporal: saudacao,
      dias_restantes: diasRestantes,
      percentual_concluido: Math.round(percentual),
      status_meta: metaBatida ? 'BATIDA!' : 'em andamento',
      status_meta_emoji: metaBatida ? '🏆' : '🏃‍♂️',
      mensagem_extra: metaBatida ? 'Parabens pela dedicacao maxima!' : diferenca >= 0 ? 'Voce esta no caminho certo para bater a meta!' : `Precisamos acelerar! Faltam ${diasRestantes} dias.`,
    };

    if (context) {
      context.dailyRanking?.forEach((item, index) => {
        const i = index + 1;
        if (i <= 3) {
          vars[`ranking_dia_${i}_nome`] = item.name;
          vars[`ranking_dia_${i}_valor`] = item.value;
        }
      });
      context.monthlyRanking?.forEach((item, index) => {
        const i = index + 1;
        if (i <= 3) {
          vars[`ranking_mes_${i}_nome`] = item.name;
          vars[`ranking_mes_${i}_valor`] = item.value;
        }
      });
      vars.total_vendas_dia = context.totalDailySales || 0;
      vars.total_vendas_mes = context.totalMonthlySales || 0;
      vars.meta_dia_time = context.dailyGoal || 0;
      vars.meta_mes_time = context.monthlyGoal || 0;
      vars.bateram_meta_dia = context.sellersMetDailyGoal?.join(', ') || 'Ninguem ainda';
      vars.numero_vendedores_baixa = context.sellersBelowThreshold || 0;
    }

    return vars;
  },
};
