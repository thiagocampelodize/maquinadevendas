import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { markFirstScreenRendered } from '@/lib/bootstrap-diagnostics';

const loginSchema = z.object({
  username: z.string().min(1, 'Informe seu usuário ou e-mail'),
  password: z.string().min(1, 'Informe sua senha'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { error } = useToastContext();
  const router = useRouter();

  useEffect(() => {
    markFirstScreenRendered('login');
  }, []);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    const result = await signIn(data.username, data.password);

    if (!result.success) {
       error('Falha no login', { message: result.error || 'Usuário ou senha incorretos' });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-8">
          <Image
            source={require('../../assets/logo-main.png')}
            style={{ width: 220, height: 70 }}
            resizeMode="contain"
          />
        </View>

        <Card style={{ width: '100%', maxWidth: 420 }}>
          <Text className="mb-1 text-center text-3xl font-bold text-white">Entrar</Text>
          <Text className="mb-6 text-center text-sm text-[#9CA3AF]">Faça login para acessar o sistema</Text>

          <Controller
            control={control}
            name="username"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Usuário"
                value={value}
                onChangeText={onChange}
                placeholder="Usuário ou e-mail"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ marginBottom: 6 }}
              />
            )}
          />
          {errors.username ? (
            <Text className="mb-3 text-sm text-[#F87171]">{errors.username.message}</Text>
          ) : null}

          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange } }) => (
              <Input
                label="Senha"
                value={value}
                onChangeText={onChange}
                placeholder="Digite sua senha"
                secureTextEntry
                style={{ marginBottom: 6 }}
              />
            )}
          />
          {errors.password ? (
            <Text className="mb-3 text-sm text-[#F87171]">{errors.password.message}</Text>
          ) : null}

          <Button loading={isSubmitting} onPress={handleSubmit(onSubmit)}>
            Entrar
          </Button>

          <Button className="mt-3" variant="outline" onPress={() => router.push('/(auth)/admin-login')}>
            Acesso Administrativo
          </Button>
        </Card>

        <Text className="mt-6 text-xs text-[#6B7280]">© {new Date().getFullYear()} Máquina de Vendas - Todos os direitos reservados</Text>
      </View>
    </SafeAreaView>
  );
}
