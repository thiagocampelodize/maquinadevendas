import { Tabs } from 'expo-router';
import { BookOpen, CheckSquare, DollarSign, LayoutDashboard, User } from 'lucide-react-native';
import { View } from 'react-native';

import { ModuleHeader } from '@/components/layout/ModuleHeader';

const activeColor = '#FF6B35';
const inactiveColor = '#9CA3AF';

export default function GestorTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => (
          <View className="border-b border-border bg-background px-4 pb-2 pt-0">
            <ModuleHeader withInset />
          </View>
        ),
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: { backgroundColor: '#111111', borderTopColor: '#2D2D2D' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard stroke={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="rotina/index"
        options={{
          title: 'Rotina',
          tabBarIcon: ({ color, size }) => <CheckSquare stroke={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="vendas/index"
        options={{
          title: 'Vendas',
          tabBarIcon: ({ color, size }) => <DollarSign stroke={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="diario/index"
        options={{
          title: 'Diario',
          tabBarIcon: ({ color, size }) => <BookOpen stroke={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil/index"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User stroke={color} size={size} />,
        }}
      />
      <Tabs.Screen name="perfil/metas/index" options={{ href: null }} />
      <Tabs.Screen name="perfil/vendedores/index" options={{ href: null }} />
      <Tabs.Screen name="perfil/empresa/index" options={{ href: null }} />
      <Tabs.Screen name="perfil/assinatura/index" options={{ href: null }} />
    </Tabs>
  );
}
