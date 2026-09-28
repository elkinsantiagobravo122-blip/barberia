const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

const COLLECTIONS = {
  settings: 'settings',
  barbers: 'barbers',
  services: 'services',
  appointments: 'appointments',
  admin: 'admin',
};

const BARBER_IDS = ['carlos', 'blady', 'sebastian', 'andres'];
const DEFAULT_PIN = 6786;
const MAX_APPOINTMENTS_PER_DAY = 17;
const MAX_ADVANCE_DAYS = 7;
const DEFAULT_WEEKLY_HOURS = {
  monday: { enabled: true, open: '10:00', close: '22:00' },
  tuesday: { enabled: true, open: '10:00', close: '22:00' },
  wednesday: { enabled: true, open: '10:00', close: '22:00' },
  thursday: { enabled: true, open: '10:00', close: '22:00' },
  friday: { enabled: true, open: '10:00', close: '22:00' },
  saturday: { enabled: true, open: '10:00', close: '22:00' },
  sunday: { enabled: false, open: '10:00', close: '18:00' },
};

const getDateOnly = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getGlobalSettings = async () => {
  const snapshot = await db.collection(COLLECTIONS.settings).doc('global').get();
  if (!snapshot.exists) {
    return {
      adminPin: DEFAULT_PIN,
      openingHour: '10:00',
      closingHour: '22:00',
      maxAppointmentsPerBarberPerDay: MAX_APPOINTMENTS_PER_DAY,
      maxAdvanceDays: MAX_ADVANCE_DAYS,
      defaultBarberId: 'carlos',
      weeklyHours: DEFAULT_WEEKLY_HOURS,
    };
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
    weeklyHours: snapshot.data().weeklyHours || DEFAULT_WEEKLY_HOURS,
  };
};

const getDayName = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);
  const weekday = date.getDay();
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[weekday];
};

const getBusinessHoursForDate = async (dateString) => {
  const settings = await getGlobalSettings();
  const dayName = getDayName(dateString);
  const weeklyHours = settings.weeklyHours || DEFAULT_WEEKLY_HOURS;
  const dayConfig = weeklyHours[dayName] || { enabled: true, open: settings.openingHour || '10:00', close: settings.closingHour || '22:00' };

  if (dayConfig.enabled === false) {
    return null;
  }

  return {
    open: dayConfig.open || settings.openingHour || '10:00',
    close: dayConfig.close || settings.closingHour || '22:00',
  };
};

const getMinutesFromTime = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string') {
    return null;
  }

  const [hourText, minuteText = '0'] = timeValue.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
};

const getTimeSlotsForRange = (openTime, closeTime) => {
  const startMinutes = getMinutesFromTime(openTime);
  const endMinutes = getMinutesFromTime(closeTime);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return [];
  }

  const slots = [];
  for (let totalMinutes = startMinutes; totalMinutes < endMinutes; totalMinutes += 30) {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    slots.push(`${hours}:${minutes}`);
  }

  return slots;
};

const getBarberById = async (barberId) => {
  const doc = await db.collection(COLLECTIONS.barbers).doc(barberId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

const getUserSnapshotByEmail = async (email) => {
  const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

const getUserById = async (userId) => {
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

const cleanupExpiredAppointments = async () => {
  try {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const snapshot = await db.collection(COLLECTIONS.appointments).where('date', '<', todayString).get();

    if (!snapshot.empty) {
      const promises = snapshot.docs.map((doc) => doc.ref.delete());
      await Promise.all(promises);
      console.log(`Citas vencidas eliminadas: ${snapshot.docs.length}`);
    }
  } catch (error) {
    console.error('Error cleaning expired appointments', error);
  }
};

const getAvailableTimesForDate = async (barberId, date, serviceDurationMinutes = 40) => {
  const settings = await getGlobalSettings();
  const barber = await getBarberById(barberId);
  const dayConfig = await getBusinessHoursForDate(date);

  if (!dayConfig) {
    return [];
  }

  const openingHour = barber?.workStart || barber?.openingHour || dayConfig.open || settings.openingHour || '10:00';
  const closingHour = barber?.workEnd || barber?.closingHour || dayConfig.close || settings.closingHour || '22:00';
  const durationMinutes = Number(serviceDurationMinutes) || 40;
  const now = new Date();
  const isToday = getDateOnly(now) === date;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const slots = getTimeSlotsForRange(openingHour, closingHour);
  const snapshot = await db
    .collection(COLLECTIONS.appointments)
    .where('barberId', '==', barberId)
    .where('date', '==', date)
    .get();

  const occupiedRanges = snapshot.docs
    .map((doc) => doc.data())
    .filter((item) => item && item.time)
    .map((item) => {
      const start = getMinutesFromTime(item.time);
      const duration = Number(item.durationMinutes) || 40;
      return { start, end: start + duration };
    });

  const available = [];

  for (const time of slots) {
    const startMinutes = getMinutesFromTime(time);
    if (startMinutes === null) continue;
    const endMinutes = startMinutes + durationMinutes;
    if (endMinutes > getMinutesFromTime(closingHour)) continue;
    if (isToday && startMinutes < currentMinutes) continue;

    const overlaps = occupiedRanges.some((range) => {
      if (range.start === null || range.end === null) return false;
      return startMinutes < range.end && endMinutes > range.start;
    });

    if (!overlaps) {
      available.push(time);
    }
  }

  return available;
};

router.get('/', async (req, res) => {
  res.json({ status: 'ok', database: 'firestore' });
});

router.post('/register', async (req, res) => {
  try {
    const { email, pass, confirmPass } = req.body || {};
    if (!email || !pass || !confirmPass) {
      return res.send({ error: 'Email and password are required' });
    }

    if (pass !== confirmPass) {
      return res.send({ error: 'Passwords do not match' });
    }

    const existing = await getUserSnapshotByEmail(String(email).trim().toLowerCase());
    if (existing) {
      return res.send({ error: 'The user already exists' });
    }

    const username = String(email).split('@')[0] || 'user';
    const userRef = await db.collection('users').add({
      email: String(email).trim().toLowerCase(),
      password: String(pass),
      name: username,
      phone: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(200).send({
      id: userRef.id,
      status: 'registered',
      name: username,
      message: 'User created successfully',
    });
  } catch (error) {
    res.status(500).send({ error: 'Error creating user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, pass } = req.body || {};
    if (!email || !pass) {
      return res.send({ error: 'Email and password are required' });
    }

    const user = await getUserSnapshotByEmail(String(email).trim().toLowerCase());
    if (!user) {
      return res.send({ error: 'Sorry user not found' });
    }

    if (String(pass) !== String(user.password)) {
      return res.send({ error: 'Sorry wrong password' });
    }

    const username = String(email).split('@')[0] || user.name || 'user';
    res.send({
      id: user.id,
      status: 'logged',
      name: username,
      admin: String(email).includes('admin'),
      phone: user.phone || '',
    });
  } catch (error) {
    res.status(500).send({ error: 'Error logging in' });
  }
});

router.get('/profiledata', async (req, res) => {
  try {
    const user = await getUserById(req.query.id);
    if (!user) return res.send({ error: 'user does not exist' });

    res.send({
      email: user.email,
      phone: user.phone || '',
      name: user.name || '',
    });
  } catch (error) {
    res.status(500).send({ error: 'Error loading profile' });
  }
});

router.post('/updateprofile', async (req, res) => {
  try {
    const { name, email, phone, userID } = req.body || {};
    const userRef = db.collection('users').doc(userID);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return res.send({ error: 'user does not exist' });

    const updates = { updatedAt: new Date() };
    if (name && String(name).trim()) updates.name = String(name).trim();
    if (email && String(email).trim()) updates.email = String(email).trim().toLowerCase();
    if (phone !== undefined && phone !== null) updates.phone = String(phone).trim();

    await userRef.update(updates);
    res.send('update succeed');
  } catch (error) {
    res.status(500).send({ error: 'Error updating profile' });
  }
});

router.post('/deleteacc', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.send({ error: 'User id is required' });

    const appointmentSnapshot = await db.collection(COLLECTIONS.appointments).where('userId', '==', id).get();
    if (!appointmentSnapshot.empty) {
      await Promise.all(appointmentSnapshot.docs.map((doc) => doc.ref.delete()));
    }

    await db.collection('users').doc(id).delete();
    res.send('Account deleted successfully');
  } catch (error) {
    res.status(500).send({ error: 'Error deleting account' });
  }
});

router.get('/userappointment', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.send({ error: 'User id is required' });

    const snapshot = await db.collection(COLLECTIONS.appointments).where('userId', '==', id).limit(1).get();
    if (snapshot.empty) return res.send({ error: 'Appointment not found' });

    const appointment = snapshot.docs[0].data();
    res.send({
      day: appointment.day || '',
      time: appointment.time || '',
      date: appointment.date || '',
    });
  } catch (error) {
    res.status(500).send({ error: 'Error loading appointment' });
  }
});

router.post('/cancelappointment', async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.send({ error: 'User id is required' });

    const snapshot = await db.collection(COLLECTIONS.appointments).where('userId', '==', id).limit(1).get();
    if (snapshot.empty) return res.send({ error: 'Appointment not found' });

    await snapshot.docs[0].ref.delete();
    res.send('canceling appointment...');
  } catch (error) {
    res.status(500).send({ error: 'Error canceling appointment' });
  }
});

router.get('/getappointments', async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTIONS.appointments).get();
    const appointments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (!appointments.length) return res.send({ error: 'You have no appointments' });
    res.send(appointments);
  } catch (error) {
    res.status(500).send({ error: 'Error loading appointments' });
  }
});

router.get('/getusers', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (!users.length) return res.send({ error: 'No Users' });
    res.send(users);
  } catch (error) {
    res.status(500).send({ error: 'Error loading users' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await getGlobalSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Error loading settings' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { adminPin, openingHour, closingHour, defaultBarberId, maxAppointmentsPerBarberPerDay, maxAdvanceDays, weeklyHours } = req.body;

    const payload = {
      adminPin: adminPin ?? DEFAULT_PIN,
      openingHour: openingHour ?? '10:00',
      closingHour: closingHour ?? '22:00',
      defaultBarberId: defaultBarberId ?? 'carlos',
      maxAppointmentsPerBarberPerDay: maxAppointmentsPerBarberPerDay ?? MAX_APPOINTMENTS_PER_DAY,
      maxAdvanceDays: maxAdvanceDays ?? MAX_ADVANCE_DAYS,
      weeklyHours: weeklyHours || DEFAULT_WEEKLY_HOURS,
      updatedAt: new Date(),
    };

    await db.collection(COLLECTIONS.settings).doc('global').set(payload, { merge: true });
    await cleanupExpiredAppointments();
    res.status(200).json({ message: 'Settings saved', settings: payload });
  } catch (error) {
    res.status(500).json({ error: 'Error saving settings' });
  }
});

router.post('/barbers/:barberId/schedule', async (req, res) => {
  try {
    const { barberId } = req.params;
    const { openingHour, closingHour } = req.body;

    if (!openingHour || !closingHour) {
      return res.status(400).json({ error: 'Opening and closing hours are required' });
    }

    const barberRef = db.collection(COLLECTIONS.barbers).doc(barberId);
    const barberDoc = await barberRef.get();
    const update = {
      workStart: openingHour,
      workEnd: closingHour,
      updatedAt: new Date(),
    };

    if (barberDoc.exists) {
      await barberRef.set({ ...barberDoc.data(), ...update }, { merge: true });
    } else {
      await barberRef.set(update, { merge: true });
    }

    await cleanupExpiredAppointments();
    res.status(200).json({ message: 'Barber schedule saved', schedule: update });
  } catch (error) {
    res.status(500).json({ error: 'Error saving barber schedule' });
  }
});

router.get('/barbers', async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTIONS.barbers).orderBy('name').get();
    const barbers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(barbers.length ? barbers : [
      { id: 'carlos', name: 'Carlos', role: 'admin', imageUrl: '', bio: 'Administrador principal', active: true },
      { id: 'blady', name: 'Blady', role: 'barber', imageUrl: '', bio: 'Especialista en cortes modernos', active: true },
      { id: 'sebastian', name: 'Sebastián', role: 'barber', imageUrl: '', bio: 'Estilo clásico y cuidado', active: true },
      { id: 'andres', name: 'Andrés', role: 'barber', imageUrl: '', bio: 'Detalle y precisión', active: true },
    ]);
  } catch (error) {
    res.status(500).json({ error: 'Error loading barbers' });
  }
});

router.post('/barbers', async (req, res) => {
  try {
    const { id, name, role, imageUrl, bio, active } = req.body;
    const barberId = id || name.toLowerCase().replace(/\s+/g, '-');

    const payload = {
      name,
      role: role || 'barber',
      imageUrl: imageUrl || '',
      bio: bio || '',
      active: active !== false,
      updatedAt: new Date(),
    };

    await db.collection(COLLECTIONS.barbers).doc(barberId).set(payload, { merge: true });
    res.status(200).json({ message: 'Barber saved', id: barberId });
  } catch (error) {
    res.status(500).json({ error: 'Error saving barber' });
  }
});

router.get('/services', async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTIONS.services).orderBy('order').get();
    const services = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Error loading services' });
  }
});

router.post('/services', async (req, res) => {
  try {
    const { id, name, description, price, imageUrl, durationMinutes, order, active, link } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Service name is required' });
    }

    const serviceId = id || String(name).trim().toLowerCase().replace(/\s+/g, '-');

    const payload = {
      name: String(name).trim(),
      description: description || '',
      price: Number(price) || 0,
      imageUrl: imageUrl || '',
      link: link || '',
      durationMinutes: Number(durationMinutes) || 45,
      order: Number(order) || 1,
      active: active !== false,
      updatedAt: new Date(),
    };

    await db.collection(COLLECTIONS.services).doc(serviceId).set(payload, { merge: true });
    res.status(200).json({ message: 'Service saved', id: serviceId });
  } catch (error) {
    res.status(500).json({ error: 'Error saving service' });
  }
});

router.delete('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection(COLLECTIONS.services).doc(id).delete();
    res.status(200).json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting service' });
  }
});

router.get('/admin/pin', async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTIONS.admin).doc('pin-access').get();
    const pinData = snapshot.exists ? snapshot.data() : { pin: DEFAULT_PIN, mainAdminBarberId: 'carlos' };
    res.json(pinData);
  } catch (error) {
    res.status(500).json({ error: 'Error loading pin' });
  }
});

router.post('/admin/pin', async (req, res) => {
  try {
    const { pin, mainAdminBarberId } = req.body;

    await db.collection(COLLECTIONS.admin).doc('pin-access').set({
      pin: pin ?? DEFAULT_PIN,
      role: 'super-admin',
      mainAdminBarberId: mainAdminBarberId ?? 'carlos',
      updatedAt: new Date(),
    }, { merge: true });

    res.status(200).json({ message: 'PIN updated' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating pin' });
  }
});

router.get('/appointments/availability', async (req, res) => {
  try {
    const { barberId, date, serviceDurationMinutes } = req.query;
    if (!barberId || !date) {
      return res.status(400).json({ error: 'barberId and date are required' });
    }

    await cleanupExpiredAppointments();

    const durationMinutes = Number(serviceDurationMinutes) || 40;
    const times = await getAvailableTimesForDate(barberId, date, durationMinutes);
    const barber = await getBarberById(barberId);
    const settings = await getGlobalSettings();

    res.json({
      barber,
      date,
      serviceDurationMinutes: durationMinutes,
      availableTimes: times,
      remaining: times.length,
      maxPerDay: settings.maxAppointmentsPerBarberPerDay || MAX_APPOINTMENTS_PER_DAY,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error loading availability' });
  }
});

router.get('/appointments', async (req, res) => {
  try {
    const { date, barberId } = req.query;
    let query = db.collection(COLLECTIONS.appointments);

    if (date) query = query.where('date', '==', date);
    if (barberId) query = query.where('barberId', '==', barberId);

    const snapshot = await query.get();
    const appointments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Error loading appointments' });
  }
});

router.post('/appointments', async (req, res) => {
  try {
    const {
      clientName,
      clientPhone,
      customerEmail,
      barberId,
      barberName,
      serviceId,
      serviceName,
      date,
      time,
      notes,
      durationMinutes,
    } = req.body;

    if (!clientName || !clientPhone || !barberId || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await cleanupExpiredAppointments();

    const settings = await getGlobalSettings();
    const barber = await getBarberById(barberId);

    if (!barber) {
      return res.status(400).json({ error: 'Barber not found' });
    }

    const reservationDate = new Date(`${date}T00:00:00`);
    const today = new Date();
    const diffDays = Math.ceil((reservationDate - today) / (1000 * 60 * 60 * 24));

    const businessHours = await getBusinessHoursForDate(date);
    if (!businessHours) {
      return res.status(400).json({ error: 'The business is closed on that day' });
    }

    if (diffDays < 0 || diffDays > (settings.maxAdvanceDays || MAX_ADVANCE_DAYS)) {
      return res.status(400).json({ error: 'Date outside the allowed range' });
    }

    const requestedMinutes = getMinutesFromTime(time);
    const openMinutes = getMinutesFromTime(businessHours.open);
    const closeMinutes = getMinutesFromTime(businessHours.close);

    if (requestedMinutes === null || openMinutes === null || closeMinutes === null) {
      return res.status(400).json({ error: 'The selected time is invalid' });
    }

    if (requestedMinutes < openMinutes || requestedMinutes >= closeMinutes || requestedMinutes % 30 !== 0) {
      return res.status(400).json({ error: 'The selected time is outside the business hours' });
    }

    const todayString = getDateOnly(new Date());
    if (date === todayString) {
      const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      if (requestedMinutes < currentMinutes) {
        return res.status(400).json({ error: 'The selected time is in the past' });
      }
    }

    const sameDaySnapshot = await db
      .collection(COLLECTIONS.appointments)
      .where('barberId', '==', barberId)
      .where('date', '==', date)
      .get();

    if (sameDaySnapshot.size >= (settings.maxAppointmentsPerBarberPerDay || MAX_APPOINTMENTS_PER_DAY)) {
      return res.status(400).json({ error: 'This barber is full for that day' });
    }

    const sameTimeSnapshot = await db
      .collection(COLLECTIONS.appointments)
      .where('barberId', '==', barberId)
      .where('date', '==', date)
      .where('time', '==', time)
      .limit(1)
      .get();

    if (!sameTimeSnapshot.empty) {
      return res.status(400).json({ error: 'This time is already booked' });
    }

    const appointment = {
      clientName,
      clientPhone,
      customerEmail: customerEmail || '',
      barberId,
      barberName: barberName || barber.name,
      serviceId: serviceId || '',
      serviceName: serviceName || '',
      date,
      time,
      durationMinutes: Number(durationMinutes) || 40,
      notes: notes || '',
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await db.collection(COLLECTIONS.appointments).add(appointment);
    res.status(201).json({ message: 'Appointment created', id: ref.id, appointment });
  } catch (error) {
    res.status(500).json({ error: 'Error creating appointment' });
  }
});

router.put('/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, barberId, notes } = req.body;

    const updates = {
      ...(date ? { date } : {}),
      ...(time ? { time } : {}),
      ...(barberId ? { barberId } : {}),
      ...(notes !== undefined ? { notes } : {}),
      updatedAt: new Date(),
    };

    await db.collection(COLLECTIONS.appointments).doc(id).update(updates);
    res.status(200).json({ message: 'Appointment updated' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating appointment' });
  }
});

router.delete('/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection(COLLECTIONS.appointments).doc(id).delete();
    res.status(200).json({ message: 'Appointment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting appointment' });
  }
});

router.delete('/appointments/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const snapshot = await db
      .collection(COLLECTIONS.appointments)
      .where('date', '==', date)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ message: 'No appointments found for this date', deleted: 0 });
    }

    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    res.status(200).json({ message: 'Appointments removed for the selected date', deleted: snapshot.docs.length });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting appointments for the date' });
  }
});

router.get('/barbers/:barberId/appointments', async (req, res) => {
  try {
    const { barberId } = req.params;
    const { date } = req.query;

    let query = db.collection(COLLECTIONS.appointments).where('barberId', '==', barberId);
    if (date) query = query.where('date', '==', date);

    const snapshot = await query.get();
    const appointments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Error loading barber appointments' });
  }
});

router.get('/seed', async (req, res) => {
  try {
    await cleanupExpiredAppointments();
    const seedBarbers = [
      { id: 'carlos', name: 'Carlos', role: 'admin', imageUrl: '', bio: 'Administrador principal', active: true },
      { id: 'blady', name: 'Blady', role: 'barber', imageUrl: '', bio: 'Especialista en cortes modernos', active: true },
      { id: 'sebastian', name: 'Sebastián', role: 'barber', imageUrl: '', bio: 'Estilo clásico y cuidado', active: true },
      { id: 'andres', name: 'Andrés', role: 'barber', imageUrl: '', bio: 'Detalle y precisión', active: true },
    ];

    for (const barber of seedBarbers) {
      await db.collection(COLLECTIONS.barbers).doc(barber.id).set(barber, { merge: true });
    }

    await db.collection(COLLECTIONS.settings).doc('global').set({
      adminPin: DEFAULT_PIN,
      openingHour: '10:00',
      closingHour: '22:00',
      maxAppointmentsPerBarberPerDay: MAX_APPOINTMENTS_PER_DAY,
      maxAdvanceDays: MAX_ADVANCE_DAYS,
      defaultBarberId: 'carlos',
      updatedAt: new Date(),
    }, { merge: true });

    await db.collection(COLLECTIONS.admin).doc('pin-access').set({
      pin: DEFAULT_PIN,
      role: 'super-admin',
      mainAdminBarberId: 'carlos',
      updatedAt: new Date(),
    }, { merge: true });

    res.json({ message: 'Seed data initialized' });
  } catch (error) {
    res.status(500).json({ error: 'Error seeding data' });
  }
});

cleanupExpiredAppointments();

module.exports = router;
