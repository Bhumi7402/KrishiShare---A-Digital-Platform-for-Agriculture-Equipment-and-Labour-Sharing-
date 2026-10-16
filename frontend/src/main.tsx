import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { FormEvent, useEffect, useState, useRef } from 'react';
import { isAxiosError } from 'axios';
import { api, AdminMetrics, AdminProvider, AuthResponse, Booking, BookingInvoice, Equipment, LabourGroup, Notification, Profile, ProviderBooking, ProviderEarnings, ProviderMatch, RazorpayOrder } from './services/api';
import { calculateCompletedEarnings } from './utils/dashboard';
import { NotificationCenter, NotificationToastContainer, NotificationToastItem } from './components/NotificationCenter';
import { NotificationDashboardWidget } from './components/NotificationDashboardWidget';
import { FullScreenButton } from './components/FullScreenButton';
import { playNotificationSound } from './utils/notificationAudio';
import './styles.css';

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
    }) => { open: () => void };
  }
}

function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [labourGroups, setLabourGroups] = useState<LabourGroup[]>([]);
  const [matches, setMatches] = useState<ProviderMatch[]>([]);
  const [providerLabour, setProviderLabour] = useState<LabourGroup[]>([]);
  const [providerEquipment, setProviderEquipment] = useState<Equipment[]>([]);
  const [providerBookings, setProviderBookings] = useState<ProviderBooking[]>([]);
  const [labourForm, setLabourForm] = useState({
    groupName: '',
    workerCount: '5',
    skillType: 'General farm work',
    pricePerDay: '1500',
  });
  const [labourMessage, setLabourMessage] = useState('');
  const [equipmentForm, setEquipmentForm] = useState({
    equipmentType: 'Tractor',
    equipmentName: '',
    pricePerDay: '2500',
  });
  const [equipmentMessage, setEquipmentMessage] = useState('');
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);
  const [adminProviders, setAdminProviders] = useState<AdminProvider[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedLabour, setSelectedLabour] = useState<LabourGroup | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [taskMessage, setTaskMessage] = useState('');
  const [taskPlan, setTaskPlan] = useState<{
    requiredWorkers: number;
    requiredEquipment: string;
    estimatedDays: number;
  } | null>(null);
  const [weather, setWeather] = useState<{
    rainProbability: number;
    rainfall: number;
    windSpeed: number;
    temperature: number;
    riskLevel: string;
    recommendedDate: string;
    advisory: string;
  } | null>(null);
  const [price, setPrice] = useState<{ recommendedPrice: number; demandLevel: string } | null>(null);
  const [taskForm, setTaskForm] = useState({
    crop: 'Grapes',
    taskType: 'Spraying',
    landArea: '5',
    preferredDate: '',
  });
  const [email, setEmail] = useState('farmer@agrishare.demo');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [registrationRole, setRegistrationRole] = useState<'FARMER' | 'PROVIDER'>('FARMER');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileMessage, setProfileMessage] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('agrishare_notif_sound') !== 'false');
  const [toasts, setToasts] = useState<NotificationToastItem[]>([]);
  const previousNotificationIdsRef = useRef<Set<number>>(new Set());
  const [providerEarnings, setProviderEarnings] = useState<ProviderEarnings | null>(null);
  const [invoice, setInvoice] = useState<BookingInvoice | null>(null);

  async function showInvoice(bookingId: number) {
    try {
      const response = await api.get<BookingInvoice>(`/bookings/${bookingId}/invoice`);
      setInvoice(response.data);
    } catch {
      setBookingMessage('Receipt could not be loaded.');
    }
  }

  async function markNotificationsRead() {
    await api.post('/notifications/read-all');
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  }

  async function refreshNotifications(isBackgroundPoll = false) {
    if (!auth) return;
    try {
      const response = await api.get<Notification[]>('/notifications');
      const incoming = response.data;

      if (isBackgroundPoll && previousNotificationIdsRef.current.size > 0) {
        const brandNewUnread = incoming.filter(
          (n) => !n.read && !previousNotificationIdsRef.current.has(n.id)
        );

        if (brandNewUnread.length > 0) {
          if (soundEnabled) {
            playNotificationSound();
          }
          setToasts((prev) => [
            ...brandNewUnread.map((n) => ({
              id: n.id,
              type: n.type,
              message: n.message,
              createdAt: n.createdAt,
            })),
            ...prev,
          ].slice(0, 4));
        }
      }

      previousNotificationIdsRef.current = new Set(incoming.map((n) => n.id));
      setNotifications(incoming);
    } catch {
      // ignore poll errors
    }
  }

  function handleToggleSound() {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('agrishare_notif_sound', String(next));
      if (next) playNotificationSound();
      return next;
    });
  }

  function handleDismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // Periodic 10-second polling for real-time updates
  useEffect(() => {
    if (!auth) return;
    const interval = setInterval(() => {
      refreshNotifications(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [auth, soundEnabled]);

  // Auto-dismiss floating toasts after 6s
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  function renderNotificationBell() {
    return (
      <NotificationCenter
        notifications={notifications}
        onNotificationsChange={setNotifications}
        onRefresh={() => refreshNotifications(false)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />
    );
  }

  useEffect(() => {
    Promise.all([
      api.get<Equipment[]>('/equipment'),
      api.get<LabourGroup[]>('/labour'),
      api.get<ProviderMatch[]>('/matching/recommendations'),
    ])
      .then(([equipmentResponse, labourResponse, matchResponse]) => {
        setEquipment(equipmentResponse.data);
        setLabourGroups(labourResponse.data);
        setMatches(matchResponse.data);
      })
      .catch(() => {
        setEquipment([]);
        setLabourGroups([]);
      });
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      localStorage.setItem('agrishare_token', response.data.token);
      setAuth(response.data);
      const notificationsResponse = await api.get<Notification[]>('/notifications');
      setNotifications(notificationsResponse.data);
      if (response.data.role === 'FARMER') {
        const [bookingsResponse, profileResponse] = await Promise.all([
          api.get<Booking[]>('/bookings/my'),
          api.get<Profile>('/users/me'),
        ]);
        setBookings(bookingsResponse.data);
        setProfile(profileResponse.data);
        const coordinates = profileResponse.data.latitude != null && profileResponse.data.longitude != null
          ? `?farmerLat=${profileResponse.data.latitude}&farmerLon=${profileResponse.data.longitude}` : '';
        const matchResponse = await api.get<ProviderMatch[]>(`/matching/recommendations${coordinates}`);
        setMatches(matchResponse.data);
      } else if (response.data.role === 'PROVIDER') {
        const [providerResponse, labourResponse, bookingResponse] = await Promise.all([
          api.get<Equipment[]>('/providers/me/equipment'),
          api.get<LabourGroup[]>('/labour/me'),
          api.get<ProviderBooking[]>('/providers/me/bookings'),
        ]);
        setProviderEquipment(providerResponse.data);
        setProviderLabour(labourResponse.data);
        setProviderBookings(bookingResponse.data);
        const earningsResponse = await api.get<ProviderEarnings>('/providers/me/earnings');
        setProviderEarnings(earningsResponse.data);
      } else if (response.data.role === 'ADMIN') {
        const [metricsResponse, providersResponse] = await Promise.all([
          api.get<AdminMetrics>('/admin/dashboard'),
          api.get<AdminProvider[]>('/admin/providers'),
        ]);
        setAdminMetrics(metricsResponse.data);
        setAdminProviders(providersResponse.data);
      }

    } catch {
      setError('Login failed. Start the backend and check your credentials.');
    }

  }

  async function register(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const response = await api.post<AuthResponse>('/auth/register', {
        name,
        email,
        password,
        role: registrationRole,
      });
      localStorage.setItem('agrishare_token', response.data.token);
      setAuth(response.data);
    } catch (registrationError: unknown) {
      const message = isAxiosError<{ message?: string }>(registrationError)
        ? registrationError.response?.data?.message ?? 'Registration failed.'
        : 'Registration failed.';
      setError(message);
    }
  }

  async function createBooking(event: FormEvent) {
    event.preventDefault();
    if ((!selectedEquipment && !selectedLabour) || !startDate || !endDate) return;
    setBookingMessage('');
    try {
      const response = await api.post<Booking>('/bookings', {
        providerId: selectedEquipment?.providerId ?? selectedLabour!.providerId,
        equipmentId: selectedEquipment?.id ?? null,
        labourGroupId: selectedLabour?.id ?? null,
        startDate,
        endDate,
      });
      setBookings((current) => [response.data, ...current]);
      setBookingMessage('Booking request created successfully.');
      setSelectedEquipment(null);
      setSelectedLabour(null);
    } catch (bookingError: unknown) {
      const message = isAxiosError<{ message?: string }>(bookingError)
        ? bookingError.response?.data?.message ?? 'Booking failed. Please check the dates.'
        : 'Booking failed. Please check the dates.';
      setBookingMessage(message);
    }

  }

  async function createTask(event: FormEvent) {
    event.preventDefault();
    setTaskMessage('');
    try {
      await api.post('/tasks', {
        crop: taskForm.crop,
        taskType: taskForm.taskType,
        landArea: Number(taskForm.landArea),
        unit: 'ACRE',
        preferredDate: taskForm.preferredDate || null,
      });
      setTaskMessage('Farming task saved successfully.');
      const planResponse = await api.post('/ai/task-plan', {
        landArea: Number(taskForm.landArea),
        taskType: taskForm.taskType,
      });
      setTaskPlan(planResponse.data);
      if (taskForm.preferredDate) {
        const weatherResponse = await api.post('/weather/advisory', {
          date: taskForm.preferredDate,
          latitude: profile?.latitude ?? null,
          longitude: profile?.longitude ?? null,
        });
        setWeather(weatherResponse.data);
      } else {
        setWeather(null);
      }

      const priceResponse = await api.post('/pricing/recommendation', {
        basePrice: 1800,
        demandMultiplier: 1.08,
      });
      setPrice(priceResponse.data);
    } catch {
      setTaskMessage('Task could not be saved. Please try again.');
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setProfileMessage('');
    try {
      const response = await api.put<Profile>('/users/me', profile);
      setProfile(response.data);
      setProfileMessage('Profile and location saved successfully.');
      const coordinates = response.data.latitude != null && response.data.longitude != null
        ? `?farmerLat=${response.data.latitude}&farmerLon=${response.data.longitude}` : '';
      const matchResponse = await api.get<ProviderMatch[]>(`/matching/recommendations${coordinates}`);
      setMatches(matchResponse.data);
    } catch (profileError: unknown) {
      const message = isAxiosError<{ message?: string }>(profileError)
        ? profileError.response?.data?.message ?? 'Profile could not be saved.'
        : 'Profile could not be saved.';
      setProfileMessage(message);
    }

  }

  async function completeDummyPayment(booking: Booking) {
    const response = await api.post<Booking>(`/bookings/${booking.id}/pay`);
    setBookings((items) => items.map((item) => item.id === booking.id ? response.data : item));
    setBookingMessage('Dummy payment successful. Booking marked as paid.');
  }

  async function startPayment(booking: Booking) {
    try {
      const order = await api.post<RazorpayOrder>(`/bookings/${booking.id}/payment-order`);
      if (!window.Razorpay) {
        await completeDummyPayment(booking);
        return;
      }
      const checkout = new window.Razorpay({
        key: order.data.keyId,
        amount: order.data.amount,
        currency: order.data.currency,
        name: 'AgriShare AI',
        description: `Booking #${booking.id}`,
        order_id: order.data.id,
        handler: async (response) => {
          try {
            const verified = await api.post<Booking>(`/bookings/${booking.id}/payment-verify`, {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            setBookings((items) => items.map((item) => item.id === booking.id ? verified.data : item));
            setBookingMessage('Payment verified successfully.');
          } catch {
            setBookingMessage('Payment verification failed.');
          }
        },
      });
      checkout.open();
    } catch (paymentError: unknown) {
      if (isAxiosError(paymentError) && paymentError.response?.status === 503) {
        try {
          await completeDummyPayment(booking);
        } catch {
          setBookingMessage('Dummy payment could not be completed.');
        }
        return;
      }
      const message = isAxiosError<{ message?: string }>(paymentError)
        ? paymentError.response?.data?.message ?? 'Payment could not be started.'
        : 'Payment could not be started.';
      setBookingMessage(message);
    }
  }

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    if (reviewBookingId === null) return;
    try {
      await api.post('/reviews', {
        bookingId: reviewBookingId,
        rating: Number(reviewRating),
        comment: reviewComment || null,
      });
      setReviewBookingId(null);
      setReviewComment('');
      setBookingMessage('Review submitted successfully.');
    } catch (reviewError: unknown) {
      const message = isAxiosError<{ message?: string }>(reviewError)
        ? reviewError.response?.data?.message ?? 'Review could not be submitted.'
        : 'Review could not be submitted.';
      setBookingMessage(message);
    }

  }

  async function createLabourGroup(event: FormEvent) {
    event.preventDefault();
    setLabourMessage('');
    try {
      const response = await api.post<LabourGroup>('/labour/me', {
        groupName: labourForm.groupName,
        workerCount: Number(labourForm.workerCount),
        skillType: labourForm.skillType,
        pricePerDay: Number(labourForm.pricePerDay),
      });
      setProviderLabour((groups) => [...groups, response.data]);
      setLabourForm({ ...labourForm, groupName: '' });
      setLabourMessage('Labour group created successfully.');
    } catch (groupError: unknown) {
      const message = isAxiosError<{ message?: string }>(groupError)
        ? groupError.response?.data?.message ?? 'Labour group could not be created.'
        : 'Labour group could not be created.';
      setLabourMessage(message);
    }

  }

  async function createEquipment(event: FormEvent) {
    event.preventDefault();
    setEquipmentMessage('');
    try {
      const response = await api.post<Equipment>('/providers/me/equipment', {
        equipmentType: equipmentForm.equipmentType,
        equipmentName: equipmentForm.equipmentName,
        pricePerDay: Number(equipmentForm.pricePerDay),
      });
      setProviderEquipment((items) => [...items, response.data]);
      setEquipmentForm({ ...equipmentForm, equipmentName: '' });
      setEquipmentMessage('Equipment listing created successfully.');
    } catch (equipmentError: unknown) {
      const message = isAxiosError<{ message?: string }>(equipmentError)
        ? equipmentError.response?.data?.message ?? 'Equipment could not be created.'
        : 'Equipment could not be created.';
      setEquipmentMessage(message);
    }
  }

  async function editEquipment(item: Equipment) {
      const equipmentName = window.prompt('Equipment name', item.equipmentName);
      if (equipmentName === null) return;
      const pricePerDay = window.prompt('Price per day', String(item.pricePerDay));
      if (pricePerDay === null) return;
      try {
        const response = await api.put<Equipment>(`/providers/me/equipment/${item.id}`, {
          equipmentType: item.equipmentType,
          equipmentName,
          pricePerDay: Number(pricePerDay),
        });
        setProviderEquipment((items) => items.map((current) => current.id === item.id ? response.data : current));
        setEquipmentMessage('Equipment listing updated successfully.');
      } catch (editError: unknown) {
        const message = isAxiosError<{ message?: string }>(editError)
          ? editError.response?.data?.message ?? 'Equipment could not be updated.'
          : 'Equipment could not be updated.';
        setEquipmentMessage(message);
      }
    }

  async function deleteEquipment(item: Equipment) {
      if (!window.confirm(`Delete ${item.equipmentName}?`)) return;
      try {
        await api.delete(`/providers/me/equipment/${item.id}`);
        setProviderEquipment((items) => items.filter((current) => current.id !== item.id));
        setEquipmentMessage('Equipment listing deleted successfully.');
      } catch (deleteError: unknown) {
        const message = isAxiosError<{ message?: string }>(deleteError)
          ? deleteError.response?.data?.message ?? 'Equipment could not be deleted.'
          : 'Equipment could not be deleted.';
        setEquipmentMessage(message);
      }
    }

  async function editLabourGroup(group: LabourGroup) {
      const groupName = window.prompt('Group name', group.groupName);
      if (groupName === null) return;
      const pricePerDay = window.prompt('Price per day', String(group.pricePerDay));
      if (pricePerDay === null) return;
      try {
        const response = await api.put<LabourGroup>(`/labour/me/${group.id}`, {
          groupName,
          workerCount: group.workerCount,
          skillType: group.skillType,
          pricePerDay: Number(pricePerDay),
        });
        setProviderLabour((groups) => groups.map((current) => current.id === group.id ? response.data : current));
        setLabourMessage('Labour group updated successfully.');
      } catch (editError: unknown) {
        const message = isAxiosError<{ message?: string }>(editError)
          ? editError.response?.data?.message ?? 'Labour group could not be updated.'
          : 'Labour group could not be updated.';
        setLabourMessage(message);
      }
    }

  async function deleteLabourGroup(group: LabourGroup) {
      if (!window.confirm(`Delete ${group.groupName}?`)) return;
      try {
        await api.delete(`/labour/me/${group.id}`);
        setProviderLabour((groups) => groups.filter((current) => current.id !== group.id));
        setLabourMessage('Labour group deleted successfully.');
      } catch (deleteError: unknown) {
        const message = isAxiosError<{ message?: string }>(deleteError)
          ? deleteError.response?.data?.message ?? 'Labour group could not be deleted.'
          : 'Labour group could not be deleted.';
        setLabourMessage(message);
    }
  }

  if (auth) {
    if (auth.role === 'PROVIDER') {
      const completedEarnings = providerEarnings?.netAmount ?? calculateCompletedEarnings(providerBookings);
      return (
        <main className="shell">
          <NotificationToastContainer toasts={toasts} onDismiss={handleDismissToast} onOpenNotifications={() => {}} />
          <section className="dashboard">
            <div className="provider-header-bar">
              <div className="provider-title-group">
                <div className="provider-badge-portal">
                  ⚙️ Equipment & Labour Provider Workspace
                </div>
                <h1>Welcome, {auth.name}</h1>
              </div>

              <div className="admin-header-actions">
                <FullScreenButton />
                {renderNotificationBell()}
                <button
                  type="button"
                  className="secondary"
                  style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)' }}
                  onClick={async () => {
                    const [providerResponse, labourResponse, bookingResponse, earningsResponse] = await Promise.all([
                      api.get<Equipment[]>('/providers/me/equipment'),
                      api.get<LabourGroup[]>('/labour/me'),
                      api.get<ProviderBooking[]>('/providers/me/bookings'),
                      api.get<ProviderEarnings>('/providers/me/earnings'),
                    ]);
                    setProviderEquipment(providerResponse.data);
                    setProviderLabour(labourResponse.data);
                    setProviderBookings(bookingResponse.data);
                    setProviderEarnings(earningsResponse.data);
                  }}
                >
                  🔄 Refresh Workspace
                </button>

                <button
                  type="button"
                  className="admin-btn-logout"
                  onClick={() => {
                    localStorage.removeItem('agrishare_token');
                    setAuth(null);
                  }}
                >
                  Sign Out ➔
                </button>
              </div>
            </div>

            <div className="admin-kpi-grid">
              <article className="admin-kpi-card revenue">
                <div className="admin-kpi-header">
                  <span>Net Paid Earnings</span>
                  <div className="admin-kpi-icon">💰</div>
                </div>
                <div className="admin-kpi-value">₹{completedEarnings.toLocaleString('en-IN')}</div>
                <div className="admin-kpi-footer">
                  {providerEarnings ? (
                    <span>Gross ₹{providerEarnings.grossAmount.toLocaleString('en-IN')} · 10% Fee (₹{providerEarnings.platformCommission.toLocaleString('en-IN')})</span>
                  ) : (
                    <span>Verified Completed Bookings</span>
                  )}
                </div>
              </article>

              <article className="admin-kpi-card">
                <div className="admin-kpi-header">
                  <span>Equipment Machinery</span>
                  <div className="admin-kpi-icon">🚜</div>
                </div>
                <div className="admin-kpi-value">{providerEquipment.length}</div>
                <div className="admin-kpi-footer">
                  <span>{providerEquipment.filter(e => e.availabilityStatus === 'AVAILABLE').length} Available Online</span>
                </div>
              </article>

              <article className="admin-kpi-card gold">
                <div className="admin-kpi-header">
                  <span>Labour Teams</span>
                  <div className="admin-kpi-icon">👨‍🌾</div>
                </div>
                <div className="admin-kpi-value">{providerLabour.length}</div>
                <div className="admin-kpi-footer">
                  <span>{providerLabour.reduce((acc, curr) => acc + Number(curr.workerCount), 0)} Total Skilled Workers</span>
                </div>
              </article>

              <article className="admin-kpi-card">
                <div className="admin-kpi-header">
                  <span>Pending Requests</span>
                  <div className="admin-kpi-icon">📥</div>
                </div>
                <div className="admin-kpi-value">{providerBookings.filter(b => b.status === 'PENDING').length}</div>
                <div className="admin-kpi-footer">
                  <span>Require Accept / Reject</span>
                </div>
              </article>
            </div>

            <NotificationDashboardWidget
              notifications={notifications}
              onNotificationsChange={setNotifications}
              onRefresh={() => refreshNotifications(false)}
            />

            <div className="provider-section-title">
              <span>🚜 My Machinery Catalog ({providerEquipment.length})</span>
            </div>

            <form className="task-form card" onSubmit={createEquipment}>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)' }}>+ Add New Equipment Listing</h3>
              <div className="form-grid">
                <label>Equipment Type
                  <select value={equipmentForm.equipmentType}
                    onChange={(event) => setEquipmentForm({ ...equipmentForm, equipmentType: event.target.value })}>
                    <option>Tractor</option>
                    <option>Sprayer</option>
                    <option>Harvester</option>
                    <option>Rotavator</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>Equipment / Model Name
                  <input required placeholder="e.g. John Deere 5050D" value={equipmentForm.equipmentName}
                    onChange={(event) => setEquipmentForm({ ...equipmentForm, equipmentName: event.target.value })} />
                </label>
                <label>Daily Rate (₹/day)
                  <input required min="1" type="number" value={equipmentForm.pricePerDay}
                    onChange={(event) => setEquipmentForm({ ...equipmentForm, pricePerDay: event.target.value })} />
                </label>
              </div>
              <button type="submit" style={{ width: 'fit-content' }}>+ Add Machinery to Catalog</button>
              {equipmentMessage && <small className="notice" style={{ marginTop: '0.5rem', display: 'block' }}>{equipmentMessage}</small>}
            </form>

            <div className="provider-resource-grid">
              {providerEquipment.length === 0 && <p className="muted">No equipment listed yet.</p>}
              {providerEquipment.map((item) => (
                <article className="provider-resource-card" key={item.id}>
                  <div className="provider-card-top">
                    <div className="provider-resource-icon">🚜</div>
                    <span className={`provider-status-tag ${item.availabilityStatus}`}>
                      ● {item.availabilityStatus === 'AVAILABLE' ? 'Online & Available' : 'Paused'}
                    </span>
                  </div>
                  <div>
                    <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: 'var(--color-primary-dark)', margin: 0 }}>{item.equipmentName}</h4>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Category: {item.equipmentType}</span>
                  </div>
                  <div className="provider-price-tag">
                    ₹{Number(item.pricePerDay).toLocaleString('en-IN')} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>/ day</span>
                  </div>
                  <div className="provider-card-actions">
                    <button type="button" className="secondary" onClick={async () => {
                      const status = item.availabilityStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
                      const response = await api.put<Equipment>(`/providers/me/equipment/${item.id}/availability`, { status });
                      setProviderEquipment((items) => items.map((current) => current.id === item.id ? response.data : current));
                    }}>{item.availabilityStatus === 'AVAILABLE' ? '⏸️ Pause' : '▶️ Make Available'}</button>
                    <button type="button" className="secondary" onClick={() => editEquipment(item)}>✏️ Edit</button>
                    <button type="button" className="secondary" style={{ color: '#dc2626' }} onClick={() => deleteEquipment(item)}>🗑️ Delete</button>
                  </div>
                </article>
              ))}
            </div>

            <div className="provider-section-title">
              <span>👨‍🌾 My Farm Labour Teams ({providerLabour.length})</span>
            </div>

            <form className="task-form card" onSubmit={createLabourGroup}>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)' }}>+ Add Farm Labour Group</h3>
              <div className="form-grid">
                <label>Group / Squad Name
                  <input required placeholder="e.g. Grape Harvesting Team A" value={labourForm.groupName}
                    onChange={(event) => setLabourForm({ ...labourForm, groupName: event.target.value })} />
                </label>
                <label>Worker Count
                  <input required min="1" type="number" value={labourForm.workerCount}
                    onChange={(event) => setLabourForm({ ...labourForm, workerCount: event.target.value })} />
                </label>
                <label>Skill Expertise
                  <input required placeholder="e.g. Pruning & Crop Spraying" value={labourForm.skillType}
                    onChange={(event) => setLabourForm({ ...labourForm, skillType: event.target.value })} />
                </label>
                <label>Group Daily Rate (₹/day)
                  <input required min="1" type="number" value={labourForm.pricePerDay}
                    onChange={(event) => setLabourForm({ ...labourForm, pricePerDay: event.target.value })} />
                </label>
              </div>
              <button type="submit" style={{ width: 'fit-content' }}>+ Add Labour Group</button>
              {labourMessage && <small className="notice" style={{ marginTop: '0.5rem', display: 'block' }}>{labourMessage}</small>}
            </form>

            <div className="provider-resource-grid">
              {providerLabour.length === 0 && <p className="muted">No labour groups registered yet.</p>}
              {providerLabour.map((group) => (
                <article className="provider-resource-card" key={group.id}>
                  <div className="provider-card-top">
                    <div className="provider-resource-icon">👥</div>
                    <span className={`provider-status-tag ${group.availabilityStatus}`}>
                      ● {group.availabilityStatus === 'AVAILABLE' ? 'Available' : 'Paused'}
                    </span>
                  </div>
                  <div>
                    <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', color: 'var(--color-primary-dark)', margin: 0 }}>{group.groupName}</h4>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{group.workerCount} Workers · {group.skillType}</span>
                  </div>
                  <div className="provider-price-tag">
                    ₹{Number(group.pricePerDay).toLocaleString('en-IN')} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>/ day</span>
                  </div>
                  <div className="provider-card-actions">
                    <button type="button" className="secondary" onClick={async () => {
                      const status = group.availabilityStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
                      const response = await api.put<LabourGroup>(`/labour/me/${group.id}/availability`, { status });
                      setProviderLabour((groups) => groups.map((current) => current.id === group.id ? response.data : current));
                    }}>{group.availabilityStatus === 'AVAILABLE' ? '⏸️ Pause' : '▶️ Make Available'}</button>
                    <button type="button" className="secondary" onClick={() => editLabourGroup(group)}>✏️ Edit</button>
                    <button type="button" className="secondary" style={{ color: '#dc2626' }} onClick={() => deleteLabourGroup(group)}>🗑️ Delete</button>
                  </div>
                </article>
              ))}
            </div>

            <div className="provider-section-title">
              <span>📥 Incoming Booking Requests Queue ({providerBookings.length})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {providerBookings.length === 0 && <p className="muted">No incoming booking requests yet.</p>}
              {providerBookings.map((booking) => (
                <article className="provider-booking-item" key={booking.id}>
                  <div className="provider-booking-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary-dark)' }}>Booking #{booking.id}</strong>
                      <span className={`provider-status-pill ${booking.status}`}>
                        ● {booking.status}
                      </span>
                      {booking.paymentStatus && (
                        <span className="provider-status-pill" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                          💳 {booking.paymentStatus}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.95rem', color: '#475569' }}>
                      📅 Dates: <strong>{booking.startDate}</strong> to <strong>{booking.endDate}</strong>
                    </span>
                    <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>
                      Total Booking Value: ₹{Number(booking.totalPrice).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    {booking.status === 'PENDING' && (
                      <>
                        <button
                          onClick={async () => {
                            const result = await api.post<ProviderBooking>(`/providers/me/bookings/${booking.id}/accept`);
                            setProviderBookings((items) => items.map((item) => (item.id === booking.id ? result.data : item)));
                          }}
                        >
                          ✅ Accept Booking
                        </button>
                        <button
                          className="secondary"
                          style={{ color: '#dc2626' }}
                          onClick={async () => {
                            const result = await api.post<ProviderBooking>(`/providers/me/bookings/${booking.id}/reject`);
                            setProviderBookings((items) => items.map((item) => (item.id === booking.id ? result.data : item)));
                          }}
                        >
                          🚫 Reject
                        </button>
                      </>
                    )}

                    {booking.status === 'ACCEPTED' && (
                      <button
                        onClick={async () => {
                          const result = await api.post<ProviderBooking>(`/providers/me/bookings/${booking.id}/complete`);
                          setProviderBookings((items) => items.map((item) => (item.id === booking.id ? result.data : item)));
                        }}
                      >
                        ✔️ Mark Completed & Collect
                      </button>
                    )}

                    {(booking.paymentStatus === 'PAID' || booking.paymentStatus === 'REFUNDED') && (
                      <button className="secondary" onClick={() => showInvoice(booking.id)}>
                        🧾 View Receipt
                      </button>
                    )}
                  </div>

                  {invoice?.bookingId === booking.id && (
                    <section className="insight card" aria-live="polite" style={{ width: '100%', marginTop: '1rem' }}>
                      <h2>Receipt #{invoice.invoiceNumber}</h2>
                      <p>{invoice.resourceName} · {invoice.startDate} to {invoice.endDate}</p>
                      <p>Payment Status: {invoice.paymentStatus} · Total Amount: ₹{Number(invoice.totalAmount).toLocaleString('en-IN')}</p>
                      <button className="secondary" onClick={() => setInvoice(null)}>Close Receipt</button>
                    </section>
                  )}
                </article>
              ))}
            </div>
          </section>
        </main>
      );
    }
    if (auth.role === 'ADMIN' && adminMetrics) {
      return (
        <main className="shell">
          <NotificationToastContainer toasts={toasts} onDismiss={handleDismissToast} onOpenNotifications={() => {}} />
          <section className="dashboard">
            <div className="admin-header-bar">
              <div className="admin-title-group">
                <div className="admin-badge-portal">
                  🛡️ System Administrator Command Center
                </div>
                <h1>Platform Command & Analytics</h1>
              </div>

              <div className="admin-header-actions">
                <FullScreenButton />
                {renderNotificationBell()}
                <button
                  type="button"
                  className="secondary"
                  style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)' }}
                  onClick={async () => {
                    const [metricsResponse, providersResponse] = await Promise.all([
                      api.get<AdminMetrics>('/admin/dashboard'),
                      api.get<AdminProvider[]>('/admin/providers'),
                    ]);
                    setAdminMetrics(metricsResponse.data);
                    setAdminProviders(providersResponse.data);
                  }}
                >
                  🔄 Refresh Data
                </button>

                <button
                  type="button"
                  className="admin-btn-logout"
                  onClick={() => {
                    localStorage.removeItem('agrishare_token');
                    setAuth(null);
                  }}
                >
                  Sign Out ➔
                </button>
              </div>
            </div>

            <div className="admin-kpi-grid">
              <article className="admin-kpi-card">
                <div className="admin-kpi-header">
                  <span>Registered Farmers</span>
                  <div className="admin-kpi-icon">👨‍🌾</div>
                </div>
                <div className="admin-kpi-value">{adminMetrics.totalFarmers}</div>
                <div className="admin-kpi-footer">
                  <span style={{ color: '#16a34a' }}>● Active</span>
                  <span>Agricultural Users</span>
                </div>
              </article>

              <article className="admin-kpi-card gold">
                <div className="admin-kpi-header">
                  <span>Equipment Providers</span>
                  <div className="admin-kpi-icon">⚙️</div>
                </div>
                <div className="admin-kpi-value">{adminMetrics.totalProviders}</div>
                <div className="admin-kpi-footer">
                  <span>Verified & Pending Partners</span>
                </div>
              </article>

              <article className="admin-kpi-card">
                <div className="admin-kpi-header">
                  <span>Listed Machinery</span>
                  <div className="admin-kpi-icon">🚜</div>
                </div>
                <div className="admin-kpi-value">{adminMetrics.totalEquipment}</div>
                <div className="admin-kpi-footer">
                  <span>Tractors & Implements</span>
                </div>
              </article>

              <article className="admin-kpi-card">
                <div className="admin-kpi-header">
                  <span>Total Bookings</span>
                  <div className="admin-kpi-icon">📅</div>
                </div>
                <div className="admin-kpi-value">{adminMetrics.totalBookings}</div>
                <div className="admin-kpi-footer">
                  <span>Completed & Active</span>
                </div>
              </article>

              <article className="admin-kpi-card cancel">
                <div className="admin-kpi-header">
                  <span>Cancelled</span>
                  <div className="admin-kpi-icon">🚫</div>
                </div>
                <div className="admin-kpi-value">{adminMetrics.cancelledBookings}</div>
                <div className="admin-kpi-footer">
                  <span>Refunded / Cancelled</span>
                </div>
              </article>

              <article className="admin-kpi-card revenue">
                <div className="admin-kpi-header">
                  <span>Completed Revenue</span>
                  <div className="admin-kpi-icon">💰</div>
                </div>
                <div className="admin-kpi-value">₹{Number(adminMetrics.totalRevenue).toLocaleString('en-IN')}</div>
                <div className="admin-kpi-footer">
                  <span>10% Platform Share Model</span>
                </div>
              </article>
            </div>

            <div className="admin-forecast-card">
              <div className="admin-forecast-header">
                <div className="admin-forecast-title">
                  <span style={{ fontSize: '1.5rem' }}>🤖</span>
                  <span>AI Demand & Market Forecast</span>
                </div>
                <div className="admin-forecast-chip">
                  ✨ Real-time ML Intelligence
                </div>
              </div>
              <div className="admin-forecast-body">
                {adminMetrics.demandForecast}
              </div>
            </div>

            <div className="admin-provider-panel">
              <div className="admin-panel-header">
                <div className="admin-panel-title">
                  Partner & Provider Verification Management ({adminProviders.length})
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="admin-provider-table">
                  <thead>
                    <tr>
                      <th>Provider / Business Name</th>
                      <th>Account Email</th>
                      <th>Current Verification Status</th>
                      <th>Action / Modify Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminProviders.map((provider) => (
                      <tr className="admin-provider-row" key={provider.id}>
                        <td>
                          <div className="admin-provider-info">
                            <div className="admin-provider-avatar">
                              {provider.businessName ? provider.businessName.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <div>
                              <strong>{provider.businessName || 'Independent Provider'}</strong>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ID #{provider.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', color: '#334155' }}>{provider.email}</span>
                        </td>
                        <td>
                          <span className={`admin-status-badge ${provider.verificationStatus}`}>
                            ● {provider.verificationStatus}
                          </span>
                        </td>
                        <td>
                          <select
                            className="admin-select-status"
                            value={provider.verificationStatus}
                            onChange={async (event) => {
                              const response = await api.put<AdminProvider>(
                                `/admin/providers/${provider.id}/verification`,
                                { status: event.target.value }
                              );
                              setAdminProviders((items) =>
                                items.map((item) => (item.id === provider.id ? response.data : item))
                              );
                            }}
                          >
                            <option value="PENDING">⌛ Pending</option>
                            <option value="VERIFIED">✅ Verified</option>
                            <option value="SUSPENDED">🛑 Suspended</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-system-grid">
              <div className="admin-system-card">
                <div className="admin-system-icon">🐘</div>
                <div>
                  <strong>PostgreSQL & PostGIS</strong>
                  <div style={{ fontSize: '0.82rem', color: '#16a34a' }}>● Database Connected & Migrated</div>
                </div>
              </div>

              <div className="admin-system-card">
                <div className="admin-system-icon">🐍</div>
                <div>
                  <strong>FastAPI ML Service</strong>
                  <div style={{ fontSize: '0.82rem', color: '#16a34a' }}>● Active on Port 8001</div>
                </div>
              </div>

              <div className="admin-system-card">
                <div className="admin-system-icon">💳</div>
                <div>
                  <strong>Razorpay Gateway</strong>
                  <div style={{ fontSize: '0.82rem', color: '#16a34a' }}>● HMAC Verification Enabled</div>
                </div>
              </div>
            </div>
          </section>
        </main>
      );
    }
    return (
      <main className="shell">
        <NotificationToastContainer toasts={toasts} onDismiss={handleDismissToast} onOpenNotifications={() => {}} />
        <section className="dashboard">
          {/* Header Bar */}
          <div className="provider-header-bar">
            <div className="provider-title-group">
              <div className="provider-badge-portal">
                🌾 Farmer Workspace & Ecosystem
              </div>
              <h1>Welcome, {auth.name}</h1>
            </div>

            <div className="admin-header-actions">
              <FullScreenButton />
              {renderNotificationBell()}
              <button
                type="button"
                className="secondary"
                style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)' }}
                onClick={async () => {
                  const [bookingsResponse, profileResponse, equipmentResponse, labourResponse] = await Promise.all([
                    api.get<Booking[]>('/bookings/my'),
                    api.get<Profile>('/users/me'),
                    api.get<Equipment[]>('/equipment'),
                    api.get<LabourGroup[]>('/labour'),
                  ]);
                  setBookings(bookingsResponse.data);
                  setProfile(profileResponse.data);
                  setEquipment(equipmentResponse.data);
                  setLabourGroups(labourResponse.data);
                }}
              >
                🔄 Refresh
              </button>

              <button
                type="button"
                className="admin-btn-logout"
                onClick={() => {
                  localStorage.removeItem('agrishare_token');
                  setAuth(null);
                }}
              >
                Sign Out ➔
              </button>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="admin-kpi-grid">
            <article className="admin-kpi-card revenue">
              <div className="admin-kpi-header">
                <span>Active Bookings</span>
                <div className="admin-kpi-icon">📅</div>
              </div>
              <div className="admin-kpi-value">{bookings.filter(b => b.status === 'PENDING' || b.status === 'ACCEPTED').length}</div>
              <div className="admin-kpi-footer">
                <span>Total {bookings.length} Placed Bookings</span>
              </div>
            </article>

            <article className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span>Rain Forecast</span>
                <div className="admin-kpi-icon">🌦️</div>
              </div>
              <div className="admin-kpi-value">{weather ? `${weather.rainProbability}%` : '—'}</div>
              <div className="admin-kpi-footer">
                <span>{weather ? `${weather.riskLevel} risk level` : 'Plan task to see forecast'}</span>
              </div>
            </article>

            <article className="admin-kpi-card gold">
              <div className="admin-kpi-header">
                <span>Farm Location</span>
                <div className="admin-kpi-icon">📍</div>
              </div>
              <div className="admin-kpi-value" style={{ fontSize: '1.25rem' }}>
                {profile?.village || profile?.district
                  ? `${profile.village || ''}, ${profile.district || ''}`
                  : 'Pune, MH'}
              </div>
              <div className="admin-kpi-footer">
                <span>{profile?.latitude != null ? `GPS: ${profile.latitude}°N, ${profile.longitude}°E` : 'GPS ready'}</span>
              </div>
            </article>

            <article className="admin-kpi-card">
              <div className="admin-kpi-header">
                <span>AI Recommended Providers</span>
                <div className="admin-kpi-icon">✨</div>
              </div>
              <div className="admin-kpi-value">{matches.length}</div>
              <div className="admin-kpi-footer">
                <span>Ranked Nearby Machinery & Labour</span>
              </div>
            </article>
          </div>

          {/* Notifications */}
          <NotificationDashboardWidget
            notifications={notifications}
            onNotificationsChange={setNotifications}
            onRefresh={() => refreshNotifications(false)}
          />

          {/* Profile & Location */}
          {profile && (
            <form className="task-form card" onSubmit={saveProfile}>
              <div className="admin-panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>📍</span>
                  <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)', margin: 0 }}>
                    Profile & Farm Location
                  </h3>
                </div>
              </div>
              <div className="form-grid">
                <label>Farmer Full Name
                  <input required value={profile.name}
                    onChange={e => setProfile({ ...profile, name: e.target.value })} />
                </label>
                <label>Contact Phone
                  <input placeholder="9876543210" value={profile.phone ?? ''}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })} />
                </label>
                <label>Village Name
                  <input placeholder="e.g. Baramati" value={profile.village ?? ''}
                    onChange={e => setProfile({ ...profile, village: e.target.value })} />
                </label>
                <label>District
                  <input placeholder="e.g. Pune" value={profile.district ?? ''}
                    onChange={e => setProfile({ ...profile, district: e.target.value })} />
                </label>
                <label>GPS Latitude
                  <input type="number" min="-90" max="90" step="any" placeholder="18.5204"
                    value={profile.latitude ?? ''}
                    onChange={e => setProfile({ ...profile, latitude: e.target.value === '' ? undefined : Number(e.target.value) })} />
                </label>
                <label>GPS Longitude
                  <input type="number" min="-180" max="180" step="any" placeholder="73.8567"
                    value={profile.longitude ?? ''}
                    onChange={e => setProfile({ ...profile, longitude: e.target.value === '' ? undefined : Number(e.target.value) })} />
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="submit">💾 Save Profile & Coordinates</button>
                {profileMessage && <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ {profileMessage}</span>}
              </div>
            </form>
          )}

          {/* AI Crop Task Planner & Weather Intelligence */}
          <div className="provider-section-title">
            <span>🤖 AI Crop Task Planner & Weather Intelligence</span>
          </div>

          <form className="task-form card" onSubmit={createTask}>
            <div className="admin-panel-header">
              <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)', margin: 0 }}>
                🌱 Create Farming Task & Generate AI Plan
              </h3>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700 }}>
                ✨ ML Powered
              </span>
            </div>
            <div className="form-grid">
              <label>Crop Type
                <select value={taskForm.crop} onChange={e => setTaskForm({ ...taskForm, crop: e.target.value })}>
                  <option>Grapes</option>
                  <option>Onion</option>
                  <option>Cotton</option>
                  <option>Banana</option>
                  <option>Sugarcane</option>
                  <option>Tomato</option>
                </select>
              </label>
              <label>Task Operation
                <input required placeholder="e.g. Spraying / Harvesting" value={taskForm.taskType}
                  onChange={e => setTaskForm({ ...taskForm, taskType: e.target.value })} />
              </label>
              <label>Land Area (Acres)
                <input required min="0.1" step="0.1" type="number" value={taskForm.landArea}
                  onChange={e => setTaskForm({ ...taskForm, landArea: e.target.value })} />
              </label>
              <label>Preferred Date
                <input type="date" value={taskForm.preferredDate}
                  onChange={e => setTaskForm({ ...taskForm, preferredDate: e.target.value })} />
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="submit">✨ Generate AI Plan & Weather Forecast</button>
              {taskMessage && <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ {taskMessage}</span>}
            </div>

            {/* AI Results */}
            {taskPlan && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginTop: '1rem' }}>
                <strong style={{ color: '#15803d', display: 'block', marginBottom: '0.75rem' }}>🧠 AI Resource Recommendation</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', display: 'block' }}>WORKERS NEEDED</small>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f291e' }}>{taskPlan.requiredWorkers}</span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', display: 'block' }}>MACHINERY</small>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f291e' }}>{taskPlan.requiredEquipment}</span>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <small style={{ color: '#64748b', display: 'block' }}>EST. DURATION</small>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f291e' }}>{taskPlan.estimatedDays} days</span>
                  </div>
                </div>
              </div>
            )}

            {weather && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '1.25rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#0369a1' }}>🌦️ Open-Meteo Weather Advisory</strong>
                  <span className={`farmer-weather-badge ${weather.riskLevel}`}>{weather.riskLevel} RISK</span>
                </div>
                <p style={{ margin: '0.5rem 0 1rem', color: '#334155' }}>{weather.advisory}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
                    <small style={{ color: '#64748b', display: 'block' }}>RAIN</small>
                    <strong style={{ color: '#0284c7' }}>{weather.rainProbability}%</strong>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
                    <small style={{ color: '#64748b', display: 'block' }}>RAINFALL</small>
                    <strong style={{ color: '#0284c7' }}>{weather.rainfall} mm</strong>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
                    <small style={{ color: '#64748b', display: 'block' }}>WIND</small>
                    <strong style={{ color: '#0284c7' }}>{weather.windSpeed} km/h</strong>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
                    <small style={{ color: '#64748b', display: 'block' }}>TEMP</small>
                    <strong style={{ color: '#0284c7' }}>{weather.temperature}°C</strong>
                  </div>
                </div>
                <div style={{ marginTop: '0.85rem', padding: '0.65rem', background: '#e0f2fe', borderRadius: '8px', color: '#0369a1', fontSize: '0.9rem' }}>
                  📅 AI Recommended Date: <strong>{weather.recommendedDate}</strong>
                </div>
              </div>
            )}

            {price && (
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '1.25rem', marginTop: '1rem' }}>
                <small style={{ color: '#a16207', fontWeight: 700, textTransform: 'uppercase' }}>💡 AI Fair Market Price</small>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#854d0e', margin: '0.25rem 0' }}>
                  ₹{price.recommendedPrice}<span style={{ fontSize: '1rem', fontWeight: 500, color: '#a16207' }}>/day</span>
                </div>
                <small style={{ color: '#713f12' }}>Demand Level: <strong>{price.demandLevel}</strong> · Regional pricing guardrails applied</small>
              </div>
            )}
          </form>

          {/* AI Recommended Providers */}
          {matches.length > 0 && (
            <>
              <div className="provider-section-title">
                <span>✨ AI Recommended Providers ({matches.length})</span>
              </div>
              <div className="grid">
                {matches.map((match) => (
                  <div className="card" key={match.providerId} style={{ borderLeft: '4px solid #16a34a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, color: '#0f291e' }}>{match.providerName}</h3>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803d' }}>
                        {match.finalScore}<small style={{ fontSize: '0.8rem', color: '#64748b' }}>/100</small>
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <span>⭐ {match.rating}/5 rating</span>
                      <span>•</span>
                      <span>🛡️ {match.trustScore}/100 trust</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                        <span>Availability: {match.availabilityScore}/100</span>
                        <span>Distance: {match.distanceScore}/100</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#15803d', background: '#f0fdf4', padding: '0.5rem 0.75rem', borderRadius: '6px', margin: '0.5rem 0 0' }}>
                      💡 {match.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Equipment Machinery Catalog */}
          <div className="provider-section-title">
            <span>🚜 Equipment Machinery Catalog ({equipment.length})</span>
          </div>
          <div className="grid">
            {equipment.map((item) => (
              <div className="card" key={item.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, color: '#0f291e' }}>{item.equipmentName}</h3>
                  <span className="provider-status-pill ACCEPTED" style={{ fontSize: '0.75rem' }}>● Available</span>
                </div>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{item.equipmentType} · {item.providerName}</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d', margin: '0.5rem 0' }}>
                  ₹{Number(item.pricePerDay).toLocaleString('en-IN')}<small style={{ fontSize: '0.85rem', color: '#64748b' }}>/day</small>
                </div>
                <button type="button" onClick={() => {
                  setSelectedEquipment(item);
                  setSelectedLabour(null);
                  setBookingMessage('');
                }}>
                  🚜 Book Machinery
                </button>
              </div>
            ))}
          </div>

          {/* Labour Squads */}
          <div className="provider-section-title">
            <span>👨‍🌾 Farm Labour Groups ({labourGroups.length})</span>
          </div>
          <div className="grid">
            {labourGroups.map((group) => (
              <div className="card" key={group.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, color: '#0f291e' }}>{group.groupName}</h3>
                  <span className="provider-status-pill ACCEPTED" style={{ fontSize: '0.75rem' }}>● Available</span>
                </div>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{group.workerCount} workers · {group.skillType} · {group.providerName}</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309', margin: '0.5rem 0' }}>
                  ₹{Number(group.pricePerDay).toLocaleString('en-IN')}<small style={{ fontSize: '0.85rem', color: '#64748b' }}>/day</small>
                </div>
                <button type="button" style={{ background: '#ca8a04' }} onClick={() => {
                  setSelectedLabour(group);
                  setSelectedEquipment(null);
                  setBookingMessage('');
                }}>
                  👨‍🌾 Book Labour Team
                </button>
              </div>
            ))}
          </div>

          {/* Booking Modal */}
          {(selectedEquipment || selectedLabour) && (
            <div className="farmer-booking-overlay">
              <form className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }} onSubmit={createBooking}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#0f291e' }}>
                      Book: {selectedEquipment?.equipmentName ?? selectedLabour?.groupName}
                    </h3>
                    <small style={{ color: '#64748b' }}>
                      {selectedEquipment ? '🚜 Equipment' : '👥 Labour Squad'} · <strong>₹{selectedEquipment?.pricePerDay ?? selectedLabour?.pricePerDay}/day</strong>
                    </small>
                  </div>
                  <button type="button" className="secondary" style={{ padding: '0.3rem 0.6rem' }}
                    onClick={() => { setSelectedEquipment(null); setSelectedLabour(null); }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <label>Start Date
                    <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </label>
                  <label>End Date
                    <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </label>
                </div>

                {startDate && endDate && !Number.isNaN(Date.parse(startDate))
                  && !Number.isNaN(Date.parse(endDate)) && Date.parse(endDate) >= Date.parse(startDate) && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', textAlign: 'center', marginBottom: '1rem' }}>
                    <small style={{ color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>Estimated Total</small>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d' }}>
                      ₹{(
                        (selectedEquipment?.pricePerDay ?? selectedLabour?.pricePerDay ?? 0)
                        * (Math.floor((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1)
                      ).toLocaleString('en-IN')}
                    </div>
                    <small style={{ color: '#64748b' }}>
                      {Math.floor((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1} inclusive days
                    </small>
                  </div>
                )}

                <button type="submit" style={{ width: '100%' }}>✅ Confirm Booking Request</button>
              </form>
            </div>
          )}

          {bookingMessage && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '1rem 1.5rem', borderRadius: '12px', fontWeight: 600, textAlign: 'center' }}>
              ✅ {bookingMessage}
            </div>
          )}

          {/* Booking History */}
          <div className="provider-section-title">
            <span>📋 My Booking History ({bookings.length})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bookings.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                📭 No bookings placed yet. Browse equipment or labour above to get started!
              </div>
            ) : (
              bookings.map((booking) => (
                <div className="provider-booking-item" key={booking.id}>
                  <div className="provider-booking-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <strong style={{ fontSize: '1.05rem', color: '#0f291e' }}>Booking #{booking.id}</strong>
                      <span className={`provider-status-pill ${booking.status}`}>● {booking.status}</span>
                      <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '9999px', color: '#475569', fontWeight: 600 }}>
                        💳 {booking.paymentStatus ?? 'UNPAID'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.88rem', color: '#64748b' }}>
                      📅 Dates: <strong>{booking.startDate}</strong> to <strong>{booking.endDate}</strong>
                    </span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d' }}>
                      ₹{Number(booking.totalPrice).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {(booking.status === 'PENDING' || booking.status === 'ACCEPTED') && (
                      <button
                        type="button"
                        className="secondary"
                        style={{ background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' }}
                        onClick={async () => {
                          try {
                            const response = await api.post<Booking>(`/bookings/${booking.id}/cancel`);
                            setBookings((items) => items.map((item) => item.id === booking.id ? response.data : item));
                            setBookingMessage('Booking cancelled successfully.');
                          } catch (cancelError: unknown) {
                            const message = isAxiosError<{ message?: string }>(cancelError)
                              ? cancelError.response?.data?.message ?? 'Could not cancel.'
                              : 'Could not cancel.';
                            setBookingMessage(message);
                          }
                        }}
                      >
                        Cancel
                      </button>
                    )}

                    {(booking.paymentStatus ?? 'UNPAID') === 'UNPAID'
                      && booking.status === 'ACCEPTED' && (
                      <button type="button" onClick={() => startPayment(booking)}>
                        💳 Pay Now
                      </button>
                    )}

                    {(booking.paymentStatus === 'PAID' || booking.paymentStatus === 'REFUNDED') && (
                      <button type="button" className="secondary" onClick={() => showInvoice(booking.id)}>
                        🧾 Receipt
                      </button>
                    )}

                    {booking.status === 'COMPLETED' && reviewBookingId !== booking.id && (
                      <button
                        type="button"
                        style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
                        onClick={() => setReviewBookingId(booking.id)}
                      >
                        ⭐ Rate & Review
                      </button>
                    )}
                  </div>

                  {invoice?.bookingId === booking.id && (
                    <div style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', marginTop: '0.75rem' }}>
                      <strong style={{ color: '#0f291e', display: 'block', marginBottom: '0.35rem' }}>🧾 Receipt #{invoice.invoiceNumber}</strong>
                      <div style={{ fontSize: '0.9rem', color: '#334155' }}>Resource: {invoice.resourceName} · {invoice.startDate} to {invoice.endDate}</div>
                      <div style={{ fontSize: '0.9rem', color: '#334155' }}>Provider: {invoice.providerName}</div>
                      <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 700, marginTop: '0.25rem' }}>
                        Status: {invoice.paymentStatus} · Total: ₹{Number(invoice.totalAmount).toLocaleString('en-IN')}
                      </div>
                      <button type="button" className="secondary" style={{ marginTop: '0.5rem', padding: '0.3rem 0.75rem' }} onClick={() => setInvoice(null)}>Close</button>
                    </div>
                  )}

                  {reviewBookingId === booking.id && (
                    <form onSubmit={submitReview} style={{ width: '100%', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#92400e' }}>
                        Rating (1 to 5 Stars)
                        <select value={reviewRating} onChange={e => setReviewRating(e.target.value)}>
                          <option value="5">5 ⭐ - Excellent</option>
                          <option value="4">4 ⭐ - Good</option>
                          <option value="3">3 ⭐ - Average</option>
                          <option value="2">2 ⭐ - Poor</option>
                          <option value="1">1 ⭐ - Very Poor</option>
                        </select>
                      </label>
                      <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#92400e' }}>
                        Feedback Comment
                        <input value={reviewComment} maxLength={1000} placeholder="Share your experience..." onChange={e => setReviewComment(e.target.value)} />
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" style={{ background: '#d97706' }}>Submit Review</button>
                        <button type="button" className="secondary" onClick={() => setReviewBookingId(null)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="agri-landing-shell">
      <div className="agri-bg-pattern"></div>
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <header className="agri-header">
        <a href="#" className="agri-brand" aria-label="AgriShare home">
          <img className="agri-logo-image" src="/logo.png" alt="AgriShare" />
        </a>
        <div className="agri-header-actions">
          <div className="agri-status-tag">
            <span className="agri-dot-live"></span>
            <span>Live Ecosystem</span>
          </div>
          <FullScreenButton />
        </div>
      </header>

      <div className="agri-hero-container">
        <div className="agri-hero-grid">
          <div className="agri-hero-content">
            <div className="agri-badge-eyebrow">
              ✨ AI-Powered Farm Resource Platform
            </div>
            <h1 className="agri-hero-heading">
              Book the right <span className="highlight-green">farm resource</span> at the right time.
            </h1>
            <p className="agri-hero-subtext">
              Empowering farmers and equipment providers with instant machinery booking, skilled labour matching, AI crop advisories, and weather forecasts.
            </p>

            <div className="agri-stats-row">
              <div className="agri-stat-pill">
                <span className="agri-stat-icon">🚜</span>
                <span>Tractors & Heavy Machinery</span>
              </div>
              <div className="agri-stat-pill">
                <span className="agri-stat-icon">👨‍🌾</span>
                <span>Skilled Farm Labour Groups</span>
              </div>
              <div className="agri-stat-pill">
                <span className="agri-stat-icon">🌦️</span>
                <span>Open-Meteo AI Forecasts</span>
              </div>
            </div>

            <div className="agri-quick-demo-section">
              <div className="agri-demo-title">
                <span>⚡ 1-Click Demo Logins</span>
                <small style={{ color: '#4ade80' }}>Click to Auto-fill</small>
              </div>
              <div className="agri-demo-chips">
                <button
                  type="button"
                  className={`agri-demo-chip ${email === 'farmer@agrishare.demo' ? 'active' : ''}`}
                  onClick={() => {
                    setEmail('farmer@agrishare.demo');
                    setPassword('password123');
                    setIsRegistering(false);
                    setError('');
                  }}
                >
                  <span>🌾 Farmer Demo</span>
                  <small>farmer@agrishare.demo</small>
                </button>

                <button
                  type="button"
                  className={`agri-demo-chip ${email === 'provider@agrishare.demo' ? 'active' : ''}`}
                  onClick={() => {
                    setEmail('provider@agrishare.demo');
                    setPassword('password123');
                    setIsRegistering(false);
                    setError('');
                  }}
                >
                  <span>⚙️ Provider Demo</span>
                  <small>provider@agrishare.demo</small>
                </button>

                <button
                  type="button"
                  className={`agri-demo-chip ${email === 'admin@agrishare.demo' ? 'active' : ''}`}
                  onClick={() => {
                    setEmail('admin@agrishare.demo');
                    setPassword('password123');
                    setIsRegistering(false);
                    setError('');
                  }}
                >
                  <span>🛡️ Admin Demo</span>
                  <small>admin@agrishare.demo</small>
                </button>
              </div>
            </div>
          </div>

          <div className="agri-auth-card">
            <div className="agri-auth-header">
              <h2 className="agri-auth-title">{isRegistering ? 'Join AgriShare AI' : 'Welcome Back'}</h2>
              <p className="agri-auth-subtitle">
                {isRegistering ? 'Create your account to start booking or listing' : 'Sign in to access your farm dashboard'}
              </p>
            </div>

            <div className="agri-auth-tabs">
              <button
                type="button"
                className={`agri-tab-btn ${!isRegistering ? 'active' : ''}`}
                onClick={() => { setIsRegistering(false); setError(''); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`agri-tab-btn ${isRegistering ? 'active' : ''}`}
                onClick={() => { setIsRegistering(true); setError(''); }}
              >
                Register
              </button>
            </div>

            <form onSubmit={isRegistering ? register : login} className="agri-form">
              {isRegistering && (
                <>
                  <div className="agri-input-group">
                    <label>ACCOUNT ROLE</label>
                    <div className="agri-role-selector">
                      <div
                        className={`agri-role-option ${registrationRole === 'FARMER' ? 'active' : ''}`}
                        onClick={() => setRegistrationRole('FARMER')}
                      >
                        <span style={{ fontSize: '1.2rem' }}>👨‍🌾</span>
                        <span>Farmer</span>
                      </div>
                      <div
                        className={`agri-role-option ${registrationRole === 'PROVIDER' ? 'active' : ''}`}
                        onClick={() => setRegistrationRole('PROVIDER')}
                      >
                        <span style={{ fontSize: '1.2rem' }}>🚜</span>
                        <span>Provider</span>
                      </div>
                    </div>
                  </div>

                  <div className="agri-input-group">
                    <label>FULL NAME</label>
                    <div className="agri-input-wrapper">
                      <span className="agri-input-icon">👤</span>
                      <input
                        aria-label="Name"
                        className="agri-input"
                        required
                        value={name}
                        placeholder="e.g. Ramesh Patil"
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="agri-input-group">
                <label>EMAIL ADDRESS</label>
                <div className="agri-input-wrapper">
                  <span className="agri-input-icon">✉️</span>
                  <input
                    aria-label="Email"
                    type="email"
                    className="agri-input"
                    required
                    value={email}
                    placeholder="name@agrishare.demo"
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div className="agri-input-group">
                <label>PASSWORD</label>
                <div className="agri-input-wrapper">
                  <span className="agri-input-icon">🔒</span>
                  <input
                    aria-label="Password"
                    type="password"
                    className="agri-input"
                    required
                    value={password}
                    placeholder="••••••••••••"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>

              {error && <div className="agri-error-badge">⚠️ {error}</div>}

              <button type="submit" className="agri-btn-primary">
                <span>{isRegistering ? 'Create Account' : 'Sign In to Dashboard'}</span>
                <span>➔</span>
              </button>
            </form>

            <div className="agri-trust-bar">
              <span>🔒 JWT Secure</span>
              <span>•</span>
              <span>⚡ Flyway DB</span>
              <span>•</span>
              <span>💳 Razorpay Ready</span>
            </div>
          </div>
        </div>

        <div className="agri-features-section">
          <div className="agri-section-title">
            Integrated Agricultural Ecosystem
          </div>
          <div className="agri-features-grid">
            <div className="agri-feature-card">
              <div className="agri-feature-icon">🚜</div>
              <h3>Smart Equipment Booking</h3>
              <p>Book tractors, harvesters, seeders, and boom sprayers with transparent daily pricing and verified providers.</p>
            </div>

            <div className="agri-feature-card">
              <div className="agri-feature-icon">👥</div>
              <h3>Verified Labour Groups</h3>
              <p>Access skilled farm workers for harvesting, pruning, and field maintenance with distance-based matching.</p>
            </div>

            <div className="agri-feature-card">
              <div className="agri-feature-icon">🤖</div>
              <h3>AI Weather & Task Planning</h3>
              <p>Get data-driven task duration estimates, rain probability advisories, and price recommendations powered by ML.</p>
            </div>

            <div className="agri-feature-card">
              <div className="agri-feature-icon">📈</div>
              <h3>Direct Provider Earnings</h3>
              <p>Equipment owners get automated earnings tracking, 10% platform commission breakdown, and role-protected receipts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
