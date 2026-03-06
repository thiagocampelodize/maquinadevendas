import { Moon, Sun, Sunrise, Sunset } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { Period } from '@/types';

interface ChecklistTabsProps {
  activePeriod: Period;
  setActivePeriod: (period: Period) => void;
}

const tabs: Array<{ id: Period; label: string; time: string; icon: any }> = [
  { id: 'morning', label: 'Manha', time: '08:45', icon: Sunrise },
  { id: 'midday', label: 'Meio-dia', time: '12:00', icon: Sun },
  { id: 'afternoon', label: 'Tarde', time: '17:45', icon: Sunset },
  { id: 'evening', label: 'Noite', time: '18:00', icon: Moon },
];

export function ChecklistTabs({ activePeriod, setActivePeriod }: ChecklistTabsProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activePeriod === tab.id;

        return (
          <Pressable
            key={tab.id}
            onPress={() => setActivePeriod(tab.id)}
            className={`min-w-[47%] flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-3 py-3 ${
              isActive ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-[#404040] bg-[#1a1a1a]'
            }`}
          >
            <Icon stroke={isActive ? '#FFFFFF' : '#a3a3a3'} size={16} />
            <View>
              <Text className={`text-xs ${isActive ? 'text-white' : 'text-[#a3a3a3]'}`}>{tab.label}</Text>
              <Text className={`text-[10px] ${isActive ? 'text-white/80' : 'text-[#737373]'}`}>{tab.time}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
