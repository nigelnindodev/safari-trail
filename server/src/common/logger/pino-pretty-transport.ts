import pinoPretty from 'pino-pretty';

const PINO_INTERNAL_KEYS = new Set([
  'level',
  'time',
  'pid',
  'hostname',
  'context',
  'req',
  'res',
  'responseTime',
  'err',
  'msg',
]);

export default (opts: Parameters<typeof pinoPretty>[0]) =>
  pinoPretty({
    ...opts,
    messageFormat: (log: Record<string, unknown>, messageKey: string) => {
      const msg = log[messageKey] as string;
      const rawContext = log['context'];
      const context =
        typeof rawContext === 'string' && rawContext ? `[${rawContext}] ` : '';

      const extras = Object.entries(log)
        .filter(([k]) => !PINO_INTERNAL_KEYS.has(k))
        .map(([k, v]) => {
          const formatted =
            typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
          return `${k}=${formatted}`;
        })
        .join(' ');

      return `${context}${msg}${extras ? ` — ${extras}` : ''}`;
    },
  });
