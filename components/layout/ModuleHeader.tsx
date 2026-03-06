import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

interface ModuleHeaderProps {
  withInset?: boolean;
}

export function ModuleHeader({ withInset = true }: ModuleHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotifications(user?.id);

  return (
    <View style={{ paddingTop: withInset ? Math.max(insets.top, 5) : 0 }}>
      <View className="flex-row items-center justify-between">
        <Image source={require('../../assets/logo-main.png')} style={{ width: 150, height: 45 }} resizeMode="contain" />

        <Pressable className="relative" onPress={() => router.push('/notifications')}>
          <Bell stroke="#FFFFFF" size={22} />
          {unreadCount > 0 ? (
            <View className="absolute -right-2 -top-2 min-w-[16px] items-center rounded-full bg-[#FF6B35] px-1 py-[1px]">
              <Text className="text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
