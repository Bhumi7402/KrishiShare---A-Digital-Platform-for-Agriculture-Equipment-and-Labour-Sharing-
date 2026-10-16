import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agrishare_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type AuthResponse = { token: string; name: string; role: string };
export type Profile = {
  name: string;
  email: string;
  phone?: string;
  village?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
};
export type Notification = {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export const notificationApi = {
  list: () => api.get<Notification[]>('/notifications'),
  markAllRead: () => api.post('/notifications/read-all'),
  markRead: (id: number) => api.post<Notification>(`/notifications/${id}/read`),
  delete: (id: number) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear-read'),
};
export type RazorpayOrder = {
  id: string;
  keyId: string;
  amount: number;
  currency: string;
};
export type Equipment = {
  id: number;
  equipmentType: string;
  equipmentName: string;
  pricePerDay: number;
  providerName: string;
  rating: number;
  trustScore: number;
  providerId: number;
  availabilityStatus?: string;
};

export type Booking = {
  id: number;
  status: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  paymentStatus?: string;
};
export type BookingInvoice = {
  invoiceNumber: string;
  bookingId: number;
  bookingStatus: string;
  paymentStatus: string;
  farmerName: string;
  farmerEmail: string;
  providerName: string;
  providerEmail: string;
  resourceName: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  totalAmount: number;
};

export type AdminMetrics = {
  totalFarmers: number;
  totalProviders: number;
  totalEquipment: number;
  totalBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  demandForecast: string;
};
export type AdminProvider = {
  id: number;
  businessName: string;
  providerType: string;
  email: string;
  verificationStatus: string;
};

export type ProviderBooking = Booking & { totalPrice: number };
export type ProviderEarnings = {
  grossAmount: number;
  platformCommission: number;
  netAmount: number;
  completedPaidBookings: number;
  commissionRate: number;
};
export type LabourGroup = {
  id: number;
  groupName: string;
  workerCount: number;
  skillType: string;
  pricePerDay: number;
  availabilityStatus: string;
  providerId: number;
  providerName: string;
  rating: number;
  trustScore: number;
};
export type ProviderMatch = {
  providerId: number;
  providerName: string;
  rating: number;
  trustScore: number;
  finalScore: number;
  availabilityScore: number;
  distanceScore: number;
  ratingScore: number;
  priceScore: number;
  explanation: string;
};
