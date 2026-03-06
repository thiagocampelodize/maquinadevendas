import { SafeAreaView } from 'react-native-safe-area-context';

import { GestorSales } from '@/components/sales/GestorSales';

export default function GestorSalesPage() {
  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right']}>
      <GestorSales />
    </SafeAreaView>
  );
}
