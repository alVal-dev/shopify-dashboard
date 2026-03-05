import { DocumentBuilder } from '@nestjs/swagger';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants';

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Shopify Analytics Dashboard API')
    .setDescription('API for the Shopify-like analytics dashboard demo.')
    .setVersion('1.0')
    .addCookieAuth(SESSION_COOKIE_NAME)
    .build();
}
