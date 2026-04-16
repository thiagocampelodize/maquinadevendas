import { LogOut, ShieldCheck } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';

export default function AdminProfilePage() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>

        {/* Info do admin */}
        <View className="rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#FF6B35]">
              <ShieldCheck size={22} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">{user?.name || 'Administrador'}</Text>
              <Text className="text-sm text-text-muted">{user?.email || '-'}</Text>
              <Text className="mt-0.5 text-xs text-text-faint">Super Admin</Text>
            </View>
          </View>
        </View>

        {/* Sair */}
        <View className="rounded-2xl border border-[#7F1D1D] bg-[#2A0F0F] p-4">
          <Text className="mb-3 text-sm text-red-200">Encerrar sessão administrativa</Text>
          <Pressable
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-[#7F1D1D] bg-[#3A1111]"
            onPress={() => void signOut()}
          >
            <LogOut size={16} color="#FCA5A5" />
            <Text className="text-base font-semibold text-red-300">Sair da conta</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
