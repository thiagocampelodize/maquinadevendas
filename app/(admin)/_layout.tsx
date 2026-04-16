import { Tabs } from 'expo-router';
import { Building2, LayoutDashboard, MoreHorizontal, ShieldCheck, Users } from 'lucide-react-native';
import { View } from 'react-native';

import { ModuleHeader } from '@/components/layout/ModuleHeader';

const activeColor = '#FF6B35';
const inactiveColor = '#9CA3AF';

export default function AdminLayout() {
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
        name="companies/index"
        options={{
          title: 'Empresas',
          tabBarIcon: ({ color, size }) => <Building2 stroke={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="users/index"
        options={{
          title: 'Usuários',
          tabBarIcon: ({ color, size }) => <Users stroke={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="mais/index"
        options={{
          title: 'Mais',
          tabBarIcon: ({ color, size }) => <MoreHorizontal stroke={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <ShieldCheck stroke={color} size={size} />,
        }}
      />

      {/* Telas sem entrada no tab bar — acessíveis via router.push */}
      <Tabs.Screen name="companies/[id]" options={{ href: null }} />
      <Tabs.Screen name="financial/index" options={{ href: null }} />
      <Tabs.Screen name="plans/index" options={{ href: null }} />
      <Tabs.Screen name="temp-access/index" options={{ href: null }} />
      <Tabs.Screen name="subscriptions/index" options={{ href: null }} />
      <Tabs.Screen name="reports/index" options={{ href: null }} />
      <Tabs.Screen name="gateway/index" options={{ href: null }} />
      <Tabs.Screen name="consolidated/index" options={{ href: null }} />
      <Tabs.Screen name="receivables/index" options={{ href: null }} />
    </Tabs>
  );
}
