import { createContext, useContext, type ReactNode } from 'react';
import Toast from 'react-native-toast-message';

interface ToastContextType {
  success: (title: string, options?: { message?: string }) => void;
  error: (title: string, options?: { message?: string }) => void;
  warning: (title: string, options?: { message?: string }) => void;
  info: (title: string, options?: { message?: string }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const show = (
    type: 'success' | 'error' | 'info',
    title: string,
    options?: { message?: string }
  ) => {
    Toast.show({ type, text1: title, text2: options?.message });
  };

  return (
    <ToastContext.Provider
      value={{
        success: (title, options) => show('success', title, options),
        error: (title, options) => show('error', title, options),
        warning: (title, options) => show('info', title, options),
        info: (title, options) => show('info', title, options),
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}
