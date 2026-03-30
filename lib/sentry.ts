import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

const expoConfig = Constants.expoConfig;
const appVersion = expoConfig?.version ?? 'unknown';
const bundleIdentifier =
  expoConfig?.ios?.bundleIdentifier ?? expoConfig?.android?.package ?? 'unknown';

export const isSentryEnabled = Boolean(dsn);

if (isSentryEnabled) {
  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.EXPO_PUBLIC_APP_ENV?.trim() || 'production',
    release: `${bundleIdentifier}@${appVersion}`,
    attachStacktrace: true,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });

  Sentry.setTags({
    app_version: appVersion,
    app_bundle: bundleIdentifier,
  });
}

export { Sentry };
