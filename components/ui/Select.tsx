import { ChevronDown } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { MODAL_ANIMATION_PRESETS, useModalAnimation } from '@/components/ui/useModalAnimation';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onValueChange: (value: string) => void;
}

export function Select({ label, value, options, placeholder = 'Selecione...', onValueChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [motionOffset, setMotionOffset] = useState(-6);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 0, maxHeight: 220 });
  const anchorRef = useRef<View>(null);
  const { shouldRender, animatedContentStyle } = useModalAnimation(open, {
    ...MODAL_ANIMATION_PRESETS.dropdown,
    translateFrom: motionOffset,
  });

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === value)?.label || placeholder;
  }, [options, placeholder, value]);

  const closeDropdown = () => {
    setOpen(false);
  };

  const openDropdown = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const screenHeight = Dimensions.get('window').height;
      const spacing = 8;
      const estimatedHeight = Math.min(220, Math.max(140, options.length * 44));
      const spaceBelow = screenHeight - (y + height) - spacing;
      const showAbove = spaceBelow < Math.min(estimatedHeight, 180);
      const maxHeight = Math.min(220, showAbove ? Math.max(140, y - spacing - 12) : Math.max(140, spaceBelow));
      const dropdownY = showAbove ? Math.max(12, y - maxHeight - spacing) : y + height + spacing;

      setDropdownLayout({ x, y: dropdownY, width, maxHeight });
      setMotionOffset(showAbove ? 6 : -6);
      setOpen(true);
    });
  };

  return (
    <View ref={anchorRef} collapsable={false}>
      {label ? <Text className="mb-2 text-sm text-[#D1D5DB]">{label}</Text> : null}

      <Pressable
        onPress={() => {
          if (open) {
            closeDropdown();
          } else {
            openDropdown();
          }
        }}
        className="h-12 flex-row items-center justify-between rounded-lg border border-[#2D2D2D] bg-[#1A1A1A] px-3"
      >
        <Text className={`${value ? 'text-white' : 'text-[#6B7280]'}`}>{selectedLabel}</Text>
        <ChevronDown stroke="#9CA3AF" size={16} />
      </Pressable>

      <Modal visible={shouldRender} transparent animationType="none" onRequestClose={closeDropdown}>
        <Pressable className="flex-1" onPress={closeDropdown}>
          <Animated.View
            className="absolute rounded-lg border border-[#2D2D2D] bg-[#111111]"
            style={[
              {
                left: dropdownLayout.x,
                top: dropdownLayout.y,
                width: dropdownLayout.width,
              },
              animatedContentStyle,
            ]}
          >
            <ScrollView nestedScrollEnabled style={{ maxHeight: dropdownLayout.maxHeight }}>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onValueChange(option.value);
                      closeDropdown();
                    }}
                    className={`px-3 py-3 ${active ? 'bg-[#FF6B3522]' : 'bg-transparent'}`}
                  >
                    <Text className={`${active ? 'text-[#FF6B35]' : 'text-white'}`}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}
