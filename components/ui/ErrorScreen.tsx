import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';

interface ErrorScreenProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  details?: string;
  fullScreen?: boolean;
}

export function ErrorScreen({
  title = 'Não foi possível carregar',
  message,
  onRetry,
  details,
  fullScreen = true,
}: ErrorScreenProps) {
  const [showDetails, setShowDetails] = useState(false);

  const content = (
    <View className="flex-1 items-center justify-center gap-4 px-6 py-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#2A1A12]">
        <AlertCircle size={32} color="#FF6B35" />
      </View>

      <View className="items-center gap-2">
        <Text className="text-center text-lg font-semibold text-white">{title}</Text>
        <Text className="text-center text-sm text-text-muted">{message}</Text>
      </View>

      {onRetry ? (
        <Button className="mt-2 h-11 rounded-xl px-6" onPress={onRetry}>
          <View className="flex-row items-center gap-2">
            <RefreshCw size={16} color="#FFFFFF" />
            <Text className="text-base font-semibold text-white">Tentar novamente</Text>
          </View>
        </Button>
      ) : null}

      {details ? (
        <View className="mt-2 w-full max-w-md">
          <Pressable
            className="flex-row items-center justify-center gap-1 py-2"
            onPress={() => setShowDetails((prev) => !prev)}
          >
            <Text className="text-xs text-text-faint">
              {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
            </Text>
            {showDetails ? (
              <ChevronUp size={14} color="#9CA3AF" />
            ) : (
              <ChevronDown size={14} color="#9CA3AF" />
            )}
          </Pressable>

          {showDetails ? (
            <ScrollView
              className="max-h-40 rounded-lg border border-border bg-card p-3"
              showsVerticalScrollIndicator
            >
              <Text className="text-xs text-text-muted" selectable>
                {details}
              </Text>
            </ScrollView>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (!fullScreen) {
    return content;
  }

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      style={{ backgroundColor: '#0A0A0A' }}
      edges={['left', 'right', 'top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );
}
