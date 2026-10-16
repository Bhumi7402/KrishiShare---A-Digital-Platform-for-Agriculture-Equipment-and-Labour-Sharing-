import { describe, expect, it } from 'vitest';
import { calculateCompletedEarnings } from './dashboard';

describe('calculateCompletedEarnings', () => {
  it('sums only completed bookings', () => {
    const total = calculateCompletedEarnings([
      { id: 1, status: 'COMPLETED', startDate: '', endDate: '', totalPrice: 2500 },
      { id: 2, status: 'PENDING', startDate: '', endDate: '', totalPrice: 1800 },
      { id: 3, status: 'COMPLETED', startDate: '', endDate: '', totalPrice: 1250.5 },
    ]);

    expect(total).toBe(3750.5);
  });

  it('returns zero when there are no completed bookings', () => {
    expect(calculateCompletedEarnings([
      { id: 1, status: 'CANCELLED', startDate: '', endDate: '', totalPrice: 5000 },
    ])).toBe(0);
  });
});
