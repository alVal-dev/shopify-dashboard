import { DocumentBuilder } from '@nestjs/swagger';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Shopify Analytics Dashboard API')
    .setDescription(
      'API REST simulant des données Shopify pour un dashboard analytics. ' +
        'Authentification par session cookie HttpOnly.',
    )
    .setVersion('0.1')
    .addCookieAuth('session_id', {
      type: 'apiKey',
      in: 'cookie',
      name: 'session_id',
      description: 'Session cookie set by POST /api/auth/login or POST /api/auth/demo',
    })
    .build();
}
