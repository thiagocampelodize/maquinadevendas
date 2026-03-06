import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToastContext } from '@/contexts/ToastContext';
import { adminService, type GatewayCompanyConfig, type GatewayInvoiceRow } from '@/services/adminService';
import { companiesService } from '@/services/companiesService';

export default function GatewayConfigPage() {
  const toast = useToastContext();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [syncingInvoiceId, setSyncingInvoiceId] = useState<string | null>(null);

  const [configs, setConfigs] = useState<GatewayCompanyConfig[]>([]);
  const [invoices, setInvoices] = useState<GatewayInvoiceRow[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);

  const [companyId, setCompanyId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [sandbox, setSandbox] = useState(false);
  const [billingType, setBillingType] = useState('UNDEFINED');
  const [webhookSecret, setWebhookSecret] = useState('');

  const [invoiceCompanyId, setInvoiceCompanyId] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<'pending' | 'paid' | 'overdue' | 'cancelled'>('pending');

  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'pending' | 'paid' | 'overdue' | 'cancelled'>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      setLoadError(null);
      const [{ configs: gatewayConfigs, invoices: gatewayInvoices }, companiesData] = await Promise.all([
        adminService.getGatewayOverview(),
        companiesService.getAdminCompanies(),
      ]);

      setConfigs(gatewayConfigs);
      setInvoices(gatewayInvoices);
      const companyOptions = companiesData.map((company) => ({ id: company.id, name: company.name }));
      setCompanies(companyOptions);

      if (!companyId && companyOptions.length > 0) setCompanyId(companyOptions[0].id);
      if (!invoiceCompanyId && companyOptions.length > 0) setInvoiceCompanyId(companyOptions[0].id);
      if (!invoiceDueDate) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        setInvoiceDueDate(nextWeek.toISOString().substring(0, 10));
      }
    } catch {
      setLoadError('Não foi possível carregar os dados do gateway.');
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredInvoices = useMemo(() => {
    if (invoiceStatusFilter === 'ALL') return invoices;
    return invoices.filter((invoice) => invoice.status === invoiceStatusFilter);
  }, [invoiceStatusFilter, invoices]);

  const selectedConfig = useMemo(() => configs.find((config) => config.company_id === companyId) || null, [companyId, configs]);
  const summary = useMemo(() => {
    const enabledConfigs = configs.filter((cfg) => cfg.enabled).length;
    const pendingOrOverdue = invoices.filter((inv) => inv.status === 'pending' || inv.status === 'overdue').length;
    const withGateway = invoices.filter((inv) => !!inv.gateway_charge_id).length;
    return { enabledConfigs, pendingOrOverdue, withGateway };
  }, [configs, invoices]);

  useEffect(() => {
    if (!companyId) return;
    if (selectedConfig) {
      setEnabled(selectedConfig.enabled);
      setSandbox(selectedConfig.sandbox);
      setBillingType(selectedConfig.default_billing_type || 'UNDEFINED');
      setWebhookSecret(selectedConfig.webhook_secret || '');
      return;
    }
    setEnabled(true);
    setSandbox(false);
    setBillingType('UNDEFINED');
    setWebhookSecret('');
  }, [companyId, selectedConfig]);

  const handleSaveConfig = async () => {
    if (!companyId) {
      toast.error('Selecione uma empresa.');
      return;
    }

    setSaving(true);
    const success = await adminService.upsertGatewayConfig({
      company_id: companyId,
      enabled,
      sandbox,
      default_billing_type: billingType,
      webhook_secret: webhookSecret,
    });
    setSaving(false);

    if (!success) {
      toast.error('Não foi possível salvar a configuração do gateway.');
      return;
    }

    toast.success('Configuração salva com sucesso.');
    await loadData();
  };

  const handleReconcile = async () => {
    setReconciling(true);
    const success = await adminService.reconcile(200);
    setReconciling(false);

    if (!success) {
      toast.error('Falha na reconciliação Asaas.');
      return;
    }

    toast.success('Reconciliação concluída.');
    await loadData();
  };

  const handleCreateInvoice = async () => {
    if (!invoiceCompanyId) {
      toast.error('Selecione uma empresa.');
      return;
    }
    const amount = Number(invoiceAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Informe um valor valido.');
      return;
    }
    if (!invoiceDueDate) {
      toast.error('Informe a data de vencimento.');
      return;
    }

    setCreatingInvoice(true);
    const created = await adminService.createInvoice({
      company_id: invoiceCompanyId,
      amount,
      due_date: invoiceDueDate,
      status: invoiceStatus,
    });

    if (!created.success || !created.invoiceId) {
      setCreatingInvoice(false);
      toast.error('Não foi possível criar fatura.');
      return;
    }

    const hasGateway = configs.some((cfg) => cfg.company_id === invoiceCompanyId && cfg.enabled);
    if (hasGateway) {
      await adminService.syncInvoice(created.invoiceId, 'create');
    }

    setCreatingInvoice(false);
    setInvoiceAmount('');
    toast.success('Fatura criada com sucesso.');
    await loadData();
  };

  const handleSyncInvoice = async (invoiceId: string, action: 'create' | 'update' | 'cancel') => {
    setSyncingInvoiceId(invoiceId);
    const success = await adminService.syncInvoice(invoiceId, action);
    setSyncingInvoiceId(null);
    if (!success) {
      toast.error('Falha ao sincronizar fatura.');
      return;
    }
    toast.success(`Fatura sincronizada (${action}).`);
    await loadData();
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
        <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
          <Text className="text-xl font-semibold text-white">Gateway de Pagamento Asaas</Text>
          <Text className="mt-1 text-sm text-[#9CA3AF]">Configuração por empresa, sincronização de cobranças e reconciliação.</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Tag text={`Empresas com gateway: ${summary.enabledConfigs}`} tone="green" />
            <Tag text={`Pendentes/vencidas: ${summary.pendingOrOverdue}`} tone="yellow" />
            <Tag text={`Com charge id: ${summary.withGateway}`} tone="blue" />
          </View>
          <Button className="mt-4" loading={reconciling} onPress={() => void handleReconcile()}>
            Reconciliar agora
          </Button>
        </View>

        {loading ? (
          <View className="py-8">
            <ActivityIndicator color="#FF6B35" />
            <Text className="mt-2 text-center text-sm text-[#9CA3AF]">Carregando gateway...</Text>
          </View>
        ) : loadError ? (
          <View className="py-8">
            <Text className="text-center text-sm text-[#F87171]">{loadError}</Text>
            <Button className="mt-3" onPress={() => void loadData()}>
              Tentar novamente
            </Button>
          </View>
        ) : (
          <>
            <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
              <Text className="mb-3 text-base font-semibold text-white">Configuração por empresa</Text>
              <Select label="Empresa" value={companyId} onValueChange={setCompanyId} options={companies.map((company) => ({ label: company.name, value: company.id }))} />

              <View className="mt-3 flex-row items-center justify-between rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 py-3">
                <Text className="text-sm text-[#D1D5DB]">Gateway ativo</Text>
                <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: '#374151', true: '#FF6B35' }} />
              </View>

              <View className="mt-3 flex-row items-center justify-between rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 py-3">
                <Text className="text-sm text-[#D1D5DB]">Modo sandbox</Text>
                <Switch value={sandbox} onValueChange={setSandbox} trackColor={{ false: '#374151', true: '#FF6B35' }} />
              </View>

              <View className="mt-3">
                <Select
                  label="Billing type padrao"
                  value={billingType}
                  onValueChange={setBillingType}
                  options={['UNDEFINED', 'BOLETO', 'PIX', 'CREDIT_CARD'].map((value) => ({ label: value, value }))}
                />
              </View>

              <View className="mt-3">
                <Text className="mb-2 text-sm text-[#D1D5DB]">Webhook Secret</Text>
                <TextInput
                  value={webhookSecret}
                  onChangeText={setWebhookSecret}
                  placeholder="Token de validação"
                  placeholderTextColor="#6B7280"
                  className="h-12 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
                />
              </View>

              <Button className="mt-4" loading={saving} onPress={() => void handleSaveConfig()}>
                Salvar configuração
              </Button>
            </View>

            <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
              <Text className="mb-3 text-base font-semibold text-white">Gerar fatura</Text>
              <View className="gap-3">
                <Select
                  label="Empresa"
                  value={invoiceCompanyId}
                  onValueChange={setInvoiceCompanyId}
                  options={companies.map((company) => ({ label: company.name, value: company.id }))}
                  placeholder="Selecione empresa"
                />
                <Field label="Valor" value={invoiceAmount} onChangeText={setInvoiceAmount} placeholder="799.00" keyboardType="numeric" />
                <Field label="Vencimento (YYYY-MM-DD)" value={invoiceDueDate} onChangeText={setInvoiceDueDate} placeholder="2026-03-20" />
                <Select
                  label="Status inicial"
                  value={invoiceStatus}
                  onValueChange={(value) => setInvoiceStatus(value as 'pending' | 'paid' | 'overdue' | 'cancelled')}
                  options={[
                    { label: 'Pendente', value: 'pending' },
                    { label: 'Pago', value: 'paid' },
                    { label: 'Vencido', value: 'overdue' },
                    { label: 'Cancelado', value: 'cancelled' },
                  ]}
                />
                <Button loading={creatingInvoice} onPress={() => void handleCreateInvoice()}>
                  Criar fatura
                </Button>
              </View>
            </View>

            <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
              <Select
                label="Filtrar faturas"
                value={invoiceStatusFilter}
                onValueChange={(value) => setInvoiceStatusFilter(value as 'ALL' | 'pending' | 'paid' | 'overdue' | 'cancelled')}
                options={[
                  { label: 'Todas', value: 'ALL' },
                  { label: 'Pendentes', value: 'pending' },
                  { label: 'Pagas', value: 'paid' },
                  { label: 'Vencidas', value: 'overdue' },
                  { label: 'Canceladas', value: 'cancelled' },
                ]}
              />
              <Text className="mt-2 text-xs text-[#6B7280]">{filteredInvoices.length} fatura(s) no filtro atual.</Text>

              <View className="mt-3 gap-2">
                {filteredInvoices.map((invoice) => (
                  <View key={invoice.id} className="rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-3">
                    <Text className="text-sm font-semibold text-white">{invoice.company_name}</Text>
                    <Text className="mt-1 text-xs text-[#9CA3AF]">Vencimento: {new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString('pt-BR')}</Text>
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-xs text-white">{invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
                      <Text className={`text-xs font-semibold ${invoice.status === 'paid' ? 'text-[#34D399]' : invoice.status === 'overdue' ? 'text-[#F87171]' : invoice.status === 'pending' ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'}`}>
                        {invoice.status}
                      </Text>
                    </View>

                    <View className="mt-3 flex-row gap-2">
                      <Pressable
                        className="h-9 flex-1 items-center justify-center rounded-lg border border-[#FF6B35] bg-[#2A1A12]"
                        onPress={() => void handleSyncInvoice(invoice.id, invoice.gateway_charge_id ? 'update' : 'create')}
                      >
                        {syncingInvoiceId === invoice.id ? <ActivityIndicator size="small" color="#FF6B35" /> : <Text className="text-xs font-semibold text-[#FF6B35]">{invoice.gateway_charge_id ? 'Atualizar' : 'Criar'} sync</Text>}
                      </Pressable>

                      {invoice.gateway_charge_id ? (
                        <Pressable className="h-9 flex-1 items-center justify-center rounded-lg border border-[#7F1D1D] bg-[#2A0F0F]" onPress={() => void handleSyncInvoice(invoice.id, 'cancel')}>
                          <Text className="text-xs font-semibold text-[#FCA5A5]">Cancelar no gateway</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))}
                {filteredInvoices.length === 0 ? <Text className="py-6 text-center text-sm text-[#9CA3AF]">Sem faturas para o filtro atual.</Text> : null}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tag({ text, tone }: { text: string; tone: 'green' | 'yellow' | 'blue' }) {
  const bg = tone === 'green' ? '#153A2E' : tone === 'yellow' ? '#3D2C0F' : '#10243D';
  const color = tone === 'green' ? '#34D399' : tone === 'yellow' ? '#F59E0B' : '#60A5FA';
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
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View>
      <Text className="mb-2 text-sm text-[#D1D5DB]">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        keyboardType={keyboardType}
        autoCapitalize="none"
        className="h-12 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 text-white"
      />
    </View>
  );
}
