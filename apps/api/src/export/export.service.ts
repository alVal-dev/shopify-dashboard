import { BadRequestException, Injectable } from '@nestjs/common';
import type { Customer, Order, Product } from '@shared/types';

import { MockShopifyDataService } from '../mock-shopify/mock-shopify-data.service';

export const SUPPORTED_EXPORT_TYPES = ['orders', 'products', 'customers'] as const;
export type ExportType = (typeof SUPPORTED_EXPORT_TYPES)[number];

interface CsvFile {
  filename: string;
  content: string;
}

const CSV_BOM = '\uFEFF';
const CSV_DELIMITER = ';';

@Injectable()
export class ExportService {
  constructor(private readonly mockShopifyDataService: MockShopifyDataService) {}

  generateCsv(type: string, sessionId: string, now: Date = new Date()): CsvFile {
    const exportType = this.parseExportType(type);
    const snapshot = this.mockShopifyDataService.getOrInitForSession(sessionId);

    switch (exportType) {
      case 'orders':
        return this.buildOrdersCsv(snapshot.orders, now);
      case 'products':
        return this.buildProductsCsv(snapshot.products, now);
      case 'customers':
        return this.buildCustomersCsv(snapshot.customers, now);
      default:
        return this.assertNever(exportType);
    }
  }

  private buildOrdersCsv(orders: Order[], now: Date): CsvFile {
    const headers = [
      'Order Number',
      'Customer',
      'Email',
      'Total',
      'Currency',
      'Financial Status',
      'Fulfillment Status',
      'Items',
      'City',
      'Country',
      'Date',
    ];

    const rows = orders.map((order) => [
      String(order.orderNumber),
      order.customerName,
      order.email,
      this.formatMoney(order.totalPriceCents),
      order.currency,
      order.financialStatus,
      order.fulfillmentStatus,
      String(order.lineItems.length),
      order.shippingCity,
      order.shippingCountry,
      this.formatDateTimeUtc(order.createdAt),
    ]);

    return {
      filename: this.buildFilename('orders', now),
      content: this.serializeCsv(headers, rows),
    };
  }

  private buildProductsCsv(products: Product[], now: Date): CsvFile {
    const headers = ['Title', 'Vendor', 'Type', 'Variants', 'Total Inventory', 'Created'];

    const rows = products.map((product) => [
      product.title,
      product.vendor,
      product.productType,
      String(product.variants.length),
      String(product.totalInventory),
      this.formatDateTimeUtc(product.createdAt),
    ]);

    return {
      filename: this.buildFilename('products', now),
      content: this.serializeCsv(headers, rows),
    };
  }

  private buildCustomersCsv(customers: Customer[], now: Date): CsvFile {
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Orders',
      'Total Spent',
      'Segment',
      'City',
      'Country',
      'Created',
    ];

    const rows = customers.map((customer) => [
      customer.firstName,
      customer.lastName,
      customer.email,
      String(customer.ordersCount),
      this.formatMoney(customer.totalSpentCents),
      customer.segment,
      customer.city,
      customer.country,
      this.formatDateTimeUtc(customer.createdAt),
    ]);

    return {
      filename: this.buildFilename('customers', now),
      content: this.serializeCsv(headers, rows),
    };
  }

  private parseExportType(type: string): ExportType {
    if (SUPPORTED_EXPORT_TYPES.includes(type as ExportType)) {
      return type as ExportType;
    }

    throw new BadRequestException(
      `Unsupported export type "${type}". Supported types: ${SUPPORTED_EXPORT_TYPES.join(', ')}`,
    );
  }

  private buildFilename(type: ExportType, now: Date): string {
    return `${type}-${this.formatFileDateUtc(now)}.csv`;
  }

  private formatFileDateUtc(date: Date): string {
    const year = date.getUTCFullYear();
    const month = this.pad2(date.getUTCMonth() + 1);
    const day = this.pad2(date.getUTCDate());

    return `${year}-${month}-${day}`;
  }

  private formatDateTimeUtc(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const year = date.getUTCFullYear();
    const month = this.pad2(date.getUTCMonth() + 1);
    const day = this.pad2(date.getUTCDate());
    const hours = this.pad2(date.getUTCHours());
    const minutes = this.pad2(date.getUTCMinutes());
    const seconds = this.pad2(date.getUTCSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  }

  private formatMoney(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  private serializeCsv(headers: string[], rows: string[][]): string {
    const lines = [headers, ...rows].map((row) =>
      row.map((cell) => this.escapeCsvCell(cell)).join(CSV_DELIMITER),
    );

    return `${CSV_BOM}${lines.join('\r\n')}\r\n`;
  }

  private escapeCsvCell(value: string): string {
    const needsQuoting =
      value.includes(CSV_DELIMITER) ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r');

    if (!needsQuoting) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }

  private pad2(value: number): string {
    return String(value).padStart(2, '0');
  }

  private assertNever(value: never): never {
    throw new Error(`Unhandled export type: ${String(value)}`);
  }
}
