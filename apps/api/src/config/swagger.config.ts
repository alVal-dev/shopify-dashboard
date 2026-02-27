import { DocumentBuilder } from '@nestjs/swagger';

export function buildSwaggerConfig() {
  return (
    new DocumentBuilder()
      .setTitle('Shopify Analytics Dashboard API')
      .setDescription('API for the Shopify-like analytics dashboard demo.')
      .setVersion('1.0')
      // Auth cookie: sessionId
      .addApiKey(
        {
          type: 'apiKey',
          in: 'cookie',
          name: 'sessionId',
          description: 'HttpOnly session cookie set by /api/auth/demo or /api/auth/login',
        },
        'sessionId',
      )
      .build()
  );
}
