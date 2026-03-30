import { isSentryEnabled, Sentry } from '@/lib/sentry';

type BootstrapCheckpoint = {
  stage: string;
  timestamp: string;
  data?: Record<string, string | number | boolean | null>;
};

const checkpoints: BootstrapCheckpoint[] = [];
let firstScreenRendered = false;
let watchdogReported = false;

const WATCHDOG_MS = 12000;

function syncScope() {
  if (!isSentryEnabled) return;

  const latest = checkpoints[checkpoints.length - 1];
  if (latest) {
    Sentry.setTag('bootstrap_stage', latest.stage);
  }

  Sentry.setContext('bootstrap', {
    first_screen_rendered: firstScreenRendered,
    checkpoints,
  });
}

export function markBootstrapStage(
  stage: string,
  data?: Record<string, string | number | boolean | null>
) {
  checkpoints.push({
    stage,
    timestamp: new Date().toISOString(),
    data,
  });

  if (isSentryEnabled) {
    Sentry.addBreadcrumb({
      category: 'bootstrap',
      level: 'info',
      message: stage,
      data,
    });
  }

  syncScope();
}

export function markFirstScreenRendered(screen: string) {
  firstScreenRendered = true;
  markBootstrapStage('first-screen-rendered', { screen });
}

export function captureBootstrapError(error: unknown, context: string) {
  markBootstrapStage('bootstrap-error', { context });

  if (!isSentryEnabled) return;

  Sentry.captureException(error, {
    tags: { bootstrap_context: context },
    extra: {
      checkpoints,
      firstScreenRendered,
    },
  });
}

setTimeout(() => {
  if (watchdogReported || firstScreenRendered) return;

  watchdogReported = true;
  markBootstrapStage('bootstrap-watchdog-timeout', { timeout_ms: WATCHDOG_MS });

  if (!isSentryEnabled) return;

  Sentry.captureMessage('Bootstrap watchdog timeout before first screen render', 'fatal');
}, WATCHDOG_MS);

markBootstrapStage('bootstrap-module-loaded');
