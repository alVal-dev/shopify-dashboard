import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';

import type { Customer, CustomerSegment } from '@shared/types';

export interface GenerateCustomersOptions {
  count?: number; // default 80
  daysBack?: number; // default 180 (customers created before orders)
}

const FRENCH_CITIES = [
  'Paris',
  'Marseille',
  'Lyon',
  'Toulouse',
  'Nice',
  'Nantes',
  'Montpellier',
  'Strasbourg',
  'Bordeaux',
  'Lille',
  'Rennes',
  'Reims',
  'Saint-Étienne',
  'Toulon',
  'Grenoble',
  'Dijon',
  'Angers',
  'Nîmes',
  'Villeurbanne',
  'Clermont-Ferrand',
  'Le Havre',
  'Aix-en-Provence',
  'Brest',
  'Tours',
  'Amiens',
  'Limoges',
  'Annecy',
  'Perpignan',
  'Metz',
  'Besançon',
] as const;

const EMAIL_DOMAINS = ['gmail.com', 'outlook.fr', 'yahoo.fr', 'orange.fr', 'free.fr'] as const;

@Injectable()
export class CustomersGenerator {
  generateBatch(options: GenerateCustomersOptions = {}): Customer[] {
    const { count = 80, daysBack = 180 } = options;

    if (count <= 0) {
      return [];
    }

    const now = new Date();
    const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const emailSet = new Set<string>();
    const customers: Customer[] = [];

    for (let i = 0; i < count; i++) {
      customers.push(this.generateOne({ from, to: now, emailSet }));
    }

    // Sort by creation date, oldest first
    customers.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return customers;
  }

  generateOne(params: { from: Date; to: Date; emailSet: Set<string> }): Customer {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = this.generateUniqueEmail(firstName, lastName, params.emailSet);
    const city = faker.helpers.arrayElement(FRENCH_CITIES);

    return {
      id: randomUUID(),
      firstName,
      lastName,
      email,
      ordersCount: 0,
      totalSpentCents: 0,
      segment: 'new',
      city,
      country: 'France',
      createdAt: faker.date.between({ from: params.from, to: params.to }).toISOString(),
    };
  }

  /**
   * Recalculates segment based on ordersCount.
   * Called by the orchestrator after all orders are generated.
   */
  recalculateSegments(customers: Customer[]): void {
    for (const customer of customers) {
      customer.segment = this.deriveSegment(customer.ordersCount);
    }
  }

  private deriveSegment(ordersCount: number): CustomerSegment {
    if (ordersCount >= 5) {
      return 'vip';
    }
    if (ordersCount >= 2) {
      return 'returning';
    }
    return 'new';
  }

  private generateUniqueEmail(firstName: string, lastName: string, emailSet: Set<string>): string {
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const domain = faker.helpers.arrayElement(EMAIL_DOMAINS);
      const localPart = this.buildEmailLocalPart(firstName, lastName, attempt);
      const email = `${localPart}@${domain}`;

      if (!emailSet.has(email)) {
        emailSet.add(email);
        return email;
      }
    }

    // Fallback with random suffix
    const domain = faker.helpers.arrayElement(EMAIL_DOMAINS);
    const localPart = this.buildEmailLocalPart(firstName, lastName, 0);
    const fallback = `${localPart}.${faker.string.alphanumeric(8).toLowerCase()}@${domain}`;
    emailSet.add(fallback);
    return fallback;
  }

  private buildEmailLocalPart(firstName: string, lastName: string, attempt: number): string {
    const cleanFirst = this.normalizeForEmail(firstName) || 'client';
    const cleanLast = this.normalizeForEmail(lastName) || 'shop';

    if (attempt === 0) {
      return `${cleanFirst}.${cleanLast}`;
    }

    const suffix = faker.number.int({ min: 1, max: 999 });
    return `${cleanFirst}.${cleanLast}${suffix}`;
  }

  private normalizeForEmail(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z]/g, ''); // Keep only letters
  }
}
