# Firestore para la barbería

Este proyecto ya quedó preparado para migrar la lógica actual de MongoDB a Firestore. La idea es reemplazar la base relacional por colecciones sencillas y en tiempo real.

## 1. Configuración inicial

1. Crea un proyecto en Firebase.
2. Activa Firestore Database.
3. Descarga el archivo JSON del servicio de Firebase.
4. En `server/config/config.env.example` reemplaza los valores con tus datos reales.
5. En `client/src/firebase.js` reemplaza los placeholders por tu configuración real de Firebase Web.

### Variables requeridas

```env
FIREBASE_PROJECT_ID=TU_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
PORT=5000
```

## 2. Colecciones recomendadas

### `settings`
Documento principal del sistema:

```js
{
  id: 'global',
  adminPin: 6786,
  openingHour: '10:00',
  closingHour: '22:00',
  maxAppointmentsPerBarberPerDay: 17,
  maxAdvanceDays: 7,
  defaultBarberId: 'carlos',
  updatedAt: Timestamp
}
```

### `barbers`
Documentos por barbero. Los ID recomendados son:

- `carlos`
- `blady`
- `sebastian`
- `andres`

```js
{
  id: 'carlos',
  name: 'Carlos',
  role: 'admin',
  imageUrl: 'https://...',
  bio: 'Administrador principal',
  active: true,
  createdAt: Timestamp
}
```

### `services`
Documentos por servicio:

- `corte-clasico`
- `barba`
- `cejas`
- `combo-premium`

```js
{
  id: 'corte-clasico',
  name: 'Corte clásico',
  description: 'Corte moderno y cuidado del contorno.',
  price: 25000,
  imageUrl: 'https://...',
  durationMinutes: 45,
  order: 1,
  active: true
}
```

### `appointments`
Cada cita se guarda como un documento único con su propio ID generado por Firestore:

```js
{
  id: 'AUTO_GENERATED_ID',
  clientName: 'Juan Pérez',
  clientPhone: '3001234567',
  customerEmail: 'juan@email.com',
  barberId: 'carlos',
  barberName: 'Carlos',
  serviceId: 'corte-clasico',
  serviceName: 'Corte clásico',
  date: '2026-09-27',
  time: '10:30',
  startDateTime: Timestamp,
  status: 'confirmed',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  notes: ''
}
```

### `admin`
Si quieres guardar el PIN como documento dedicado:

```js
{
  id: 'pin-access',
  pin: 6786,
  role: 'super-admin',
  mainAdminBarberId: 'carlos'
}
```

## 3. Reglas de negocio en Firestore

- Carlos es el administrador principal.
- El horario general de la página se toma desde `settings/global`.
- La barbería tiene un máximo de 17 citas por barbero por día.
- Un mismo barbero no puede tener dos citas en la misma hora del mismo día.
- El cliente no requiere registro para reservar.
- El máximo de anticipación es 7 días.

## 4. Validaciones recomendadas

En la capa del backend, valida antes de guardar una cita:

- `date` no puede estar en pasado.
- `date` no puede superar 7 días.
- `barberId` existe en `barbers`.
- `time` debe estar dentro del rango definido por `settings/global`.
- `count appointments for barber + date <= 17`.
- No duplicar la misma hora para el mismo barbero, el mismo día.

## 5. Ejemplo de IDs sugeridos

```text
settings/global
barbers/carlos
barbers/blady
barbers/sebastian
barbers/andres
services/corte-clasico
services/barba
services/cejas
services/combo-premium
appointments/{id-automatico}
admin/pin-access
```

## 6. Siguiente paso recomendado

Si quieres, lo siguiente lógico es migrar la lógica de reservas del backend para que deje de usar MongoDB y use estas colecciones de Firestore con endpoints como:

- `GET /api/settings`
- `GET /api/barbers`
- `GET /api/services`
- `POST /api/appointments`
- `PUT /api/appointments/:id`
- `DELETE /api/appointments/:id`
- `GET /api/admin/pin`
