import { Building } from 'lucide-react-native';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Step1CompanyInfoProps {
  companyName: string;
  setCompanyName: (val: string) => void;
  ownerName: string;
  setOwnerName: (val: string) => void;
  onNext: () => void;
}

export function Step1CompanyInfo({
  companyName,
  setCompanyName,
  ownerName,
  setOwnerName,
  onNext,
}: Step1CompanyInfoProps) {
  const canProceed = companyName.trim() && ownerName.trim();
  const [showErrors, setShowErrors] = useState(false);

  const handleNext = () => {
    if (!canProceed) {
      setShowErrors(true);
      return;
    }
    onNext();
  };

  return (
    <View className="gap-6">
      <View className="items-center">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-[#FF6B35]">
          <Building stroke="#FFFFFF" size={40} />
        </View>
        <Text className="mb-2 text-center text-2xl text-white">Bem-vindo ao Maquina de Vendas! 🎯</Text>
        <Text className="text-center text-text-muted">Vamos comecar conhecendo sua empresa</Text>
      </View>

      <Card>
        <Text className="mb-4 text-lg text-white">Informacoes Basicas</Text>

        <View className="gap-4">
          <View>
            <Text className="mb-2 text-sm text-text-secondary">Nome da Empresa *</Text>
            <TextInput
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Ex: Vendas Master Ltda"
              placeholderTextColor="#6B7280"
              className={`rounded-xl border-2 bg-card-elevated px-4 py-4 text-lg text-white ${showErrors && !companyName.trim() ? 'border-red-500' : 'border-[#404040]'}`}
            />
            {showErrors && !companyName.trim() ? (
              <Text className="mt-2 text-xs text-red-500">Informe o nome da empresa.</Text>
            ) : null}
          </View>

          <View>
            <Text className="mb-2 text-sm text-text-secondary">Seu Nome (Empresario/Gestor) *</Text>
            <TextInput
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="Ex: Joao Silva"
              placeholderTextColor="#6B7280"
              className={`rounded-xl border-2 bg-card-elevated px-4 py-4 text-lg text-white ${showErrors && !ownerName.trim() ? 'border-red-500' : 'border-[#404040]'}`}
            />
            {showErrors && !ownerName.trim() ? (
              <Text className="mt-2 text-xs text-red-500">Informe seu nome.</Text>
            ) : null}
          </View>
        </View>
      </Card>

      <Button disabled={!canProceed} onPress={handleNext}>
        Proximo Passo
      </Button>

      {showErrors && !canProceed ? (
        <Text className="text-center text-sm text-red-500">Preencha os campos obrigatorios para continuar.</Text>
      ) : null}
    </View>
  );
}
