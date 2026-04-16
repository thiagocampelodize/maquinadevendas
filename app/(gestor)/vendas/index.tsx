import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GestorSales } from '@/components/sales/GestorSales';

export default function GestorSalesPage() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ErrorBoundary>
        <GestorSales />
      </ErrorBoundary>
    </SafeAreaView>
  );
}
