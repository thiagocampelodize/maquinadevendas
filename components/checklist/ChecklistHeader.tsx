import { Text, View } from 'react-native';

interface ChecklistHeaderProps {
  userRole?: 'ADMIN' | 'GESTOR' | 'VENDEDOR';
}

export function ChecklistHeader({ userRole }: ChecklistHeaderProps) {
  return (
    <View className="rounded-xl border border-[#404040] bg-[#1a1a1a] p-5">
      <Text className="mb-1 text-2xl font-semibold text-white">
        {userRole === 'VENDEDOR' ? 'Lancamento de Vendas' : 'Rotina Comercial Lucrativa'}
      </Text>
      <Text className="text-sm text-[#a3a3a3]">
        {userRole === 'VENDEDOR' ? 'Registre suas vendas aqui' : 'O basico bem feito todo dia - Metodo OMC'}
      </Text>
    </View>
  );
}
