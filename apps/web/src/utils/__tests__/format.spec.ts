import { describe, expect, it } from 'vitest';
import { formatCurrency, formatNumber, formatPercent } from '../format';

describe('format', () => {
  it('formatCurrency formats cents as EUR currency', () => {
    expect(formatCurrency(12345)).toContain('123,45');
    expect(formatCurrency(12345)).toContain('€');
  });

  it('formatNumber formats number using fr-FR locale', () => {
    const result = formatNumber(12345);
    expect(result).toMatch(/12[\s\u202f]345/);
  });

  it('formatPercent formats positive values with plus sign', () => {
    expect(formatPercent(12)).toBe('+12%');
  });

  it('formatPercent formats negative values with minus sign', () => {
    expect(formatPercent(-7)).toBe('-7%');
  });

  it('formatPercent formats zero without sign', () => {
    expect(formatPercent(0)).toBe('0%');
  });
});
