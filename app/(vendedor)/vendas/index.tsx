import { ErrorBoundary } from '@/components/ErrorBoundary';
import { VendedorSales } from '@/components/sales/VendedorSales';

export default function VendedorSalesPage() {
  return (
    <ErrorBoundary>
      <VendedorSales />
    </ErrorBoundary>
  );
}
