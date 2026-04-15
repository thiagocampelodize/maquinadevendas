import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Eye, EyeOff, Shield } from 'lucide-react-native';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { markFirstScreenRendered } from '@/lib/bootstrap-diagnostics';

const loginSchema = z.object({
  username: z.string().min(1, 'Informe seu usuário ou e-mail'),
  password: z.string().min(1, 'Informe sua senha'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginScreen() {
  const { signInAdmin } = useAuth();
  const { error } = useToastContext();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    markFirstScreenRendered('admin-login');
  }, []);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    const result = await signInAdmin(values.username, values.password);

    if (!result.success) {
      error('Falha no acesso administrativo', { message: result.error || 'Não foi possível autenticar.' });
      return;
    }

    router.replace('/(admin)');
  };

  const shouldScroll = contentHeight > 0 && viewportHeight > 0 && contentHeight > viewportHeight;

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          scrollEnabled={shouldScroll}
          onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
          onContentSizeChange={(_, height) => setContentHeight(height)}
        >
          {/* Logo */}
          <View className="mb-8 items-center">
            <Image
              source={require('../../assets/logo-main.png')}
              style={{ width: 200, height: 64 }}
              resizeMode="contain"
            />
          </View>

          {/* Card */}
          <View
            className="overflow-hidden rounded-2xl border border-[#FF6B35]/40 bg-[#111111]"
            style={{ maxWidth: 420, width: '100%', alignSelf: 'center' }}
          >
            {/* Header laranja */}
            <View className="items-center bg-[#FF6B35] px-6 py-8">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white/20">
                <Shield size={32} color="#FFFFFF" />
              </View>
              <Text className="text-2xl font-bold text-white">Painel Administrativo</Text>
              <Text className="mt-1 text-sm text-white/80">Máquina de Vendas</Text>
            </View>

            {/* Formulário */}
            <View className="gap-4 p-6">
              <View>
                <Text className="text-xl font-bold text-white">Acesso Administrativo</Text>
                <Text className="mt-1 text-sm text-[#9CA3AF]">Faça login com suas credenciais de administrador</Text>
              </View>

              <View>
                <Controller
                  control={control}
                  name="username"
                  render={({ field: { value, onChange } }) => (
                    <Input
                      label="Usuário ou e-mail"
                      value={value}
                      onChangeText={onChange}
                      placeholder="admin"
                      autoCapitalize="none"
                    />
                  )}
                />
                {errors.username ? <Text className="mt-1 text-sm text-[#F87171]">{errors.username.message}</Text> : null}
              </View>

              <View>
                <Text className="mb-2 text-sm text-[#9CA3AF]">Senha</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { value, onChange } }) => (
                    <View className="h-12 flex-row items-center rounded-xl border border-[#2D2D2D] bg-[#111111] px-4">
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        placeholder="••••••••"
                        placeholderTextColor="#6B7280"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        className="flex-1 text-base text-white"
                      />
                      <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                        {showPassword
                          ? <EyeOff size={18} color="#9CA3AF" />
                          : <Eye size={18} color="#9CA3AF" />
                        }
                      </Pressable>
                    </View>
                  )}
                />
                {errors.password ? <Text className="mt-1 text-sm text-[#F87171]">{errors.password.message}</Text> : null}
              </View>

              <Button loading={isSubmitting} onPress={handleSubmit(onSubmit)}>
                Acessar Painel
              </Button>

              <Button variant="outline" onPress={() => router.replace('/(auth)/login')}>
                ← Voltar para o login principal
              </Button>
            </View>

            {/* Footer */}
            <View className="border-t border-[#2D2D2D] bg-[#0A0A0A] px-6 py-4">
              <Text className="text-center text-xs text-[#6B7280]">🔒 Ambiente seguro e protegido</Text>
              <Text className="mt-1 text-center text-xs text-[#4B5563]">
                © {new Date().getFullYear()} Máquina de Vendas - Todos os direitos reservados
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
