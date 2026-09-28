const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '';
const projectId = process.env.FIREBASE_PROJECT_ID || 'barberia-d8bac';

const resolvedServiceAccountPath = serviceAccountPath
  ? path.resolve(serviceAccountPath)
  : path.join(__dirname, 'barberia-d8bac-firebase-adminsdk-fbsvc-a14259cbb5.json');

if (!admin.apps.length) {
  if (resolvedServiceAccountPath && require('fs').existsSync(resolvedServiceAccountPath)) {
    const serviceAccount = require(resolvedServiceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
  } else {
    admin.initializeApp({
      projectId,
    });
  }
}

const db = admin.firestore();

const seedData = {
  settings: {
    global: {
      adminPin: 6786,
      openingHour: '10:00',
      closingHour: '22:00',
      maxAppointmentsPerBarberPerDay: 17,
      maxAdvanceDays: 7,
      defaultBarberId: 'carlos',
      weeklyHours: {
        monday: { enabled: true, open: '10:00', close: '22:00' },
        tuesday: { enabled: true, open: '10:00', close: '22:00' },
        wednesday: { enabled: true, open: '10:00', close: '22:00' },
        thursday: { enabled: true, open: '10:00', close: '22:00' },
        friday: { enabled: true, open: '10:00', close: '22:00' },
        saturday: { enabled: true, open: '10:00', close: '20:00' },
        sunday: { enabled: false, open: '10:00', close: '18:00' },
      },
      updatedAt: new Date().toISOString(),
    },
  },
  barbers: {
    carlos: {
      name: 'Carlos',
      role: 'admin',
      workStart: '10:00',
      workEnd: '22:00',
      bio: 'Administrador principal',
      active: true,
    },
    blady: {
      name: 'Blady',
      role: 'barber',
      workStart: '11:00',
      workEnd: '20:00',
      bio: 'Especialista en cortes modernos',
      active: true,
    },
    sebastian: {
      name: 'Sebastián',
      role: 'barber',
      workStart: '12:00',
      workEnd: '19:00',
      bio: 'Estilo clásico y cuidado',
      active: true,
    },
    andres: {
      name: 'Andrés',
      role: 'barber',
      workStart: '09:00',
      workEnd: '18:00',
      bio: 'Detalle y precisión',
      active: true,
    },
  },
  services: {
    'corte-clasico': {
      name: 'Corte clásico',
      description: 'Corte moderno y acabado profesional.',
      price: 25000,
      durationMinutes: 45,
      order: 1,
      active: true,
    },
    barba: {
      name: 'Barba',
      description: 'Perfilado y cuidado de barba.',
      price: 20000,
      durationMinutes: 30,
      order: 2,
      active: true,
    },
    cejas: {
      name: 'Cejas',
      description: 'Diseño y definición de cejas.',
      price: 15000,
      durationMinutes: 20,
      order: 3,
      active: true,
    },
    'combo-premium': {
      name: 'Combo premium',
      description: 'Corte + barba + cuidado.',
      price: 42000,
      durationMinutes: 60,
      order: 4,
      active: true,
    },
  },
  admin: {
    'pin-access': {
      pin: 6786,
      role: 'super-admin',
      mainAdminBarberId: 'carlos',
    },
  },
};

async function ensureDocExists(collectionName, docId, payload) {
  const ref = db.collection(collectionName).doc(docId);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set(payload, { merge: true });
    console.log(`Creado: ${collectionName}/${docId}`);
  } else {
    console.log(`Ya existe: ${collectionName}/${docId}`);
  }
}

async function initializeFirestoreCollections() {
  try {
    for (const [collectionName, docs] of Object.entries(seedData)) {
      for (const [docId, payload] of Object.entries(docs)) {
        await ensureDocExists(collectionName, docId, payload);
      }
    }

    console.log('Firestore inicializado correctamente.');
  } catch (error) {
    console.error('Error inicializando Firestore:', error);
    process.exitCode = 1;
  }
}

initializeFirestoreCollections();
