import { formatCurrency, formatDate } from '../format';

describe('formatCurrency', () => {
  it('formats a number as USD currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    expect(formatDate('2024-01-15T00:00:00.000Z')).toMatch(/Jan.*2024/);
  });
});
