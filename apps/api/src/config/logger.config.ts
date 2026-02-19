import { Params } from 'nestjs-pino';

/**
 * Configuration du logger Pino.
 *
 * En développement : logs formatés avec pino-pretty pour la lisibilité.
 * En production : logs JSON bruts, parseables par les outils d'observabilité.
 */
export function getLoggerConfig(nodeEnv: string): Params {
  const isDev = nodeEnv !== 'production';

  return {
    pinoHttp: {
      level: isDev ? 'debug' : 'info',

      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:HH:MM:ss',
              ignore: 'pid,hostname',
            },
          }
        : undefined,

      autoLogging: isDev ? false : true,

      customProps: () => ({
        context: 'HTTP',
      }),
    },
  };
}
