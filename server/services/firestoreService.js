const { db } = require('../config/firebase');

const COLLECTIONS = {
  settings: 'settings',
  barbers: 'barbers',
  services: 'services',
  appointments: 'appointments',
  admin: 'admin',
};

const getDoc = async (collection, docId) => {
  const snapshot = await db.collection(collection).doc(docId).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
};

const getGlobalSettings = async () => {
  return getDoc(COLLECTIONS.settings, 'global');
};

const getBarbers = async () => {
  const snapshot = await db.collection(COLLECTIONS.barbers).orderBy('name').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const getServices = async () => {
  const snapshot = await db.collection(COLLECTIONS.services).orderBy('order').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const getAppointmentsByDate = async (date) => {
  const snapshot = await db
    .collection(COLLECTIONS.appointments)
    .where('date', '==', date)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const getAppointmentsByBarberAndDate = async (barberId, date) => {
  const snapshot = await db
    .collection(COLLECTIONS.appointments)
    .where('barberId', '==', barberId)
    .where('date', '==', date)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const hasSlotAvailable = async (barberId, date, time) => {
  const snapshot = await db
    .collection(COLLECTIONS.appointments)
    .where('barberId', '==', barberId)
    .where('date', '==', date)
    .where('time', '==', time)
    .limit(1)
    .get();

  return snapshot.empty;
};

const createAppointment = async (appointmentData) => {
  const docRef = db.collection(COLLECTIONS.appointments).doc();
  const payload = {
    ...appointmentData,
    status: 'confirmed',
    createdAt: new Date(),
  };

  await docRef.set(payload);
  return { id: docRef.id, ...payload };
};

const updateAppointment = async (appointmentId, changes) => {
  const ref = db.collection(COLLECTIONS.appointments).doc(appointmentId);
  await ref.update(changes);
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
};

const cancelAppointment = async (appointmentId) => {
  const ref = db.collection(COLLECTIONS.appointments).doc(appointmentId);
  await ref.update({ status: 'cancelled', cancelledAt: new Date() });
  return true;
};

module.exports = {
  COLLECTIONS,
  getDoc,
  getGlobalSettings,
  getBarbers,
  getServices,
  getAppointmentsByDate,
  getAppointmentsByBarberAndDate,
  hasSlotAvailable,
  createAppointment,
  updateAppointment,
  cancelAppointment,
};
