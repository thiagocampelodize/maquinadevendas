export const generateSecurePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%&*';
  let password = '';

  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
};

export const getPasswordStrength = (
  password: string
): { level: number; label: string; color: string } => {
  if (!password) return { level: 0, label: '', color: '' };

  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[@#$%&*]/.test(password)) strength++;

  if (strength <= 1) return { level: 1, label: 'Fraca', color: 'bg-red-500' };
  if (strength <= 3) return { level: 2, label: 'Média', color: 'bg-yellow-500' };
  if (strength <= 4) return { level: 3, label: 'Boa', color: 'bg-blue-500' };
  return { level: 4, label: 'Forte', color: 'bg-green-500' };
};
