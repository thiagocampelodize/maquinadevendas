export interface ChecklistContentItem {
  description: string;
  detailedExplanation: string;
  lessonLink?: string;
}

export const CHECKLIST_CONTENT: Record<string, ChecklistContentItem> = {
  'analise seu painel de metas': {
    description: 'Revise numeros, calcule metas do dia e faca suas projecoes',
    detailedExplanation:
      'Inicie o dia abrindo o painel de metas. Analise os numeros do mes ate agora, calcule quanto precisa vender hoje para bater a meta mensal, e faca todas as contas necessarias para ter clareza total sobre os objetivos do dia.',
    lessonLink: 'https://youtu.be/AI5Mx0qkw_k?si=1ws2hY5t5aoUtavV',
  },
  'reuniao de abertura de dia (max 10min)': {
    description: 'Reuna o time presencialmente ou online',
    detailedExplanation:
      'Realize uma reuniao rapida de no maximo 10 minutos com toda a equipe. Seja objetivo e direto. O foco e alinhar expectativas e passar informacoes essenciais para o time comecar o dia com clareza.',
    lessonLink: 'https://youtu.be/AI5Mx0qkw_k?si=1ws2hY5t5aoUtavV',
  },
  'passar a meta geral do dia': {
    description: 'Comunique quanto o time todo precisa vender hoje',
    detailedExplanation:
      'Informe claramente qual e a meta GERAL do dia para toda a equipe. Este numero precisa estar baseado nas suas contas e ser comunicado com confianca e energia.',
    lessonLink: 'https://youtu.be/AI5Mx0qkw_k?si=1ws2hY5t5aoUtavV',
  },
  'passe a meta individual do dia por vendedor': {
    description: 'Cada vendedor precisa saber sua meta especifica',
    detailedExplanation:
      'Comunique a meta individual de cada vendedor. Seja especifico: Joao precisa vender R$ X, Maria R$ Y, etc. Cada pessoa precisa saber exatamente qual e SUA responsabilidade no dia.',
    lessonLink: 'https://youtu.be/AI5Mx0qkw_k?si=1ws2hY5t5aoUtavV',
  },
  'foco do dia': {
    description: 'Defina o foco estrategico (ex: produto X, cliente tipo Y, promocao Z)',
    detailedExplanation:
      'Estabeleca um foco claro e especifico para o dia. Exemplos: Hoje o foco e vender o produto X, foco em clientes recorrentes, foco em fechar vendas travadas.',
    lessonLink: 'https://youtu.be/AI5Mx0qkw_k?si=1ws2hY5t5aoUtavV',
  },
  'palavra do lider (1 min)': {
    description: 'Mensagem rapida de motivacao e alinhamento',
    detailedExplanation:
      'Finalize a reuniao com uma palavra de lideranca de apenas 1 minuto. Motive, inspire, energize o time. Seja autentico e positivo.',
    lessonLink: 'https://youtu.be/AI5Mx0qkw_k?si=1ws2hY5t5aoUtavV',
  },
  'comunicacao de status (grupo)': {
    description: 'Envie mensagem ou audio no grupo dos vendedores',
    detailedExplanation:
      'Comunique o status no grupo do time. Pode ser texto ou audio. O importante e fazer a comunicacao acontecer de forma publica.',
    lessonLink: 'https://youtu.be/AI5Mx0qkw_k?si=1ws2hY5t5aoUtavV',
  },
  'comunicacao de fechamento do dia': {
    description: 'Envie mensagem/audio no grupo com os resultados',
    detailedExplanation:
      'Comunique publicamente no grupo o fechamento do dia. Esta e a hora de mostrar resultados, celebrar vitorias e criar ritual de encerramento.',
    lessonLink: 'https://youtu.be/AI5Mx0qkw_k?si=1ws2hY5t5aoUtavV',
  },
  'faca reconhecimento publico (pagamento emocional)': {
    description: 'Celebre publicamente quem performou bem',
    detailedExplanation:
      'ESSENCIAL: Faca reconhecimento publico de quem teve boa performance. Chame pelo nome, elogie o comportamento especifico, celebre a conquista.',
    lessonLink: 'https://youtu.be/AI5Mx0qkw_k?si=1ws2hY5t5aoUtavV',
  },
  'conversa com os ultimos do ranking': {
    description: 'Identifique os vendedores de menor performance do dia',
    detailedExplanation:
      'Identifique quem sao os ultimos do ranking do dia ou do mes. Estes sao os vendedores que precisam de atencao especial. Nao e punicao, e lideranca ativa.',
    lessonLink: 'https://youtu.be/AI5Mx0qkw_k?si=1ws2hY5t5aoUtavV',
  },
  'reuniao com os ultimos (max 10min)': {
    description: 'Reuna apenas quem teve menor performance',
    detailedExplanation:
      'Faca uma reuniao rapida de NO MAXIMO 10 minutos apenas com os vendedores de menor performance. A chave aqui e SEM DRAMA e SEM DESCULPA.',
    lessonLink: 'https://youtu.be/AI5Mx0qkw_k?si=1ws2hY5t5aoUtavV',
  },
};
