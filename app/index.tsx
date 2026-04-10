import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function IndexPage() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return null;

  if (isAuthenticated && role) {
    if (role === 'ADMIN') return <Redirect href="/(admin)" />;
    if (role === 'GESTOR') return <Redirect href="/(gestor)" />;
    if (role === 'VENDEDOR') return <Redirect href="/(vendedor)" />;
  }

  return <Redirect href="/(auth)/login" />;
}