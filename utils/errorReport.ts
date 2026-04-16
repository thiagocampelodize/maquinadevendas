import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getBootstrapCheckpoints } from '@/lib/bootstrap-diagnostics';

interface ErrorReportContext {
  stage?: string;
  eventId?: string | null;
  extra?: Record<string, unknown>;
}

const APP_VERSION = Constants.expoConfig?.version ?? 'unknown';
const BUNDLE_ID =
  Constants.expoConfig?.ios?.bundleIdentifier ??
  Constants.expoConfig?.android?.package ??
  'unknown';

export function buildErrorReport(
  error: Error | string | null | undefined,
  context: ErrorReportContext = {},
): string {
  const lines: string[] = [];

  const message =
    typeof error === 'string'
      ? error
      : error?.message || 'Erro desconhecido';
  const stack = error instanceof Error ? error.stack : undefined;

  lines.push(`Máquina de Vendas v${APP_VERSION}`);
  lines.push(`Bundle: ${BUNDLE_ID}`);
  lines.push(`Plataforma: ${Platform.OS} ${Platform.Version}`);
  lines.push(`Timestamp: ${new Date().toISOString()}`);

  if (context.stage) lines.push(`Stage: ${context.stage}`);
  if (context.eventId) lines.push(`Event ID: ${context.eventId}`);
  lines.push('');
  lines.push(`Erro: ${message}`);

  if (stack) {
    lines.push('');
    lines.push('Stack:');
    lines.push(stack);
  }

  if (context.extra && Object.keys(context.extra).length > 0) {
    lines.push('');
    lines.push('Extra:');
    try {
      lines.push(JSON.stringify(context.extra, null, 2));
    } catch {
      lines.push(String(context.extra));
    }
  }

  const checkpoints = getBootstrapCheckpoints();
  if (checkpoints.length > 0) {
    lines.push('');
    lines.push('Checkpoints:');
    checkpoints.forEach((cp) => {
      const suffix = cp.data ? ` ${JSON.stringify(cp.data)}` : '';
      lines.push(`- [${cp.timestamp}] ${cp.stage}${suffix}`);
    });
  }

  return lines.join('\n');
}
