export type NormalizedRole = 'ADMIN' | 'GESTOR' | 'VENDEDOR';

export const normalizeRole = (role?: string | null): NormalizedRole => {
  const normalized = (role || '').toString().toLowerCase();
  if (normalized === 'admin' || normalized === 'admin_master') return 'ADMIN';
  if (normalized === 'gestor' || normalized === 'manager') return 'GESTOR';
  if (normalized === 'vendedor' || normalized === 'operator') return 'VENDEDOR';
  return 'VENDEDOR';
};

export const normalizeTempAccessType = (type?: string | null): 'GESTOR' | 'VENDEDOR' => {
  const normalized = (type || '').toString().toLowerCase();
  if (normalized === 'gestor' || normalized === 'manager') return 'GESTOR';
  if (normalized === 'vendedor' || normalized === 'operator') return 'VENDEDOR';
  if (normalized === 'admin') return 'GESTOR';
  return 'VENDEDOR';
};
