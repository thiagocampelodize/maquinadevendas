import { Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'phone-pad'
    | 'number-pad'
    | 'decimal-pad';
  style?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  style,
}: InputProps) {
  return (
    <View style={style}>
      {label ? <Text className="mb-2 text-sm text-[#9CA3AF]">{label}</Text> : null}
      <TextInput
        className="h-12 rounded-xl border border-[#2D2D2D] bg-[#111111] px-4 text-base text-white"
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}
