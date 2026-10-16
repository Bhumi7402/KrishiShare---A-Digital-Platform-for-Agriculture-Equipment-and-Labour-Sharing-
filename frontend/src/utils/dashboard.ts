import { ProviderBooking } from '../services/api';

export function calculateCompletedEarnings(bookings: ProviderBooking[]): number {
  return bookings
    .filter((booking) => booking.status === 'COMPLETED')
    .reduce((total, booking) => total + Number(booking.totalPrice), 0);
}
