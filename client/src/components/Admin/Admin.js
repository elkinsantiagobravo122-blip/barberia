import React, { useEffect, useState, useCallback } from 'react';
import './Admin.css';
import Navbar from '../Home/Navbar/Navbar';
import { api } from '../../api';
import { setCookie, getCookie } from '../../cookies';

const DEFAULT_BARBERS = [
    { id: 'carlos', name: 'Carlos' },
    { id: 'blady', name: 'Blady' },
    { id: 'sebastian', name: 'Sebastián' },
    { id: 'andres', name: 'Andrés' },
];

const DEFAULT_WEEKLY_HOURS = {
    monday: { enabled: true, open: '10:00', close: '22:00' },
    tuesday: { enabled: true, open: '10:00', close: '22:00' },
    wednesday: { enabled: true, open: '10:00', close: '22:00' },
    thursday: { enabled: true, open: '10:00', close: '22:00' },
    friday: { enabled: true, open: '10:00', close: '22:00' },
    saturday: { enabled: true, open: '10:00', close: '20:00' },
    sunday: { enabled: false, open: '10:00', close: '18:00' },
};

const DAY_LABELS = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
};

const todayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyServiceForm = {
    id: '',
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    link: '',
    durationMinutes: 40,
    order: 1,
};

const Admin = ({ requirePin = false }) => {
    const [pin, setPin] = useState('');
    const [isAdmin, setIsAdmin] = useState(getCookie('admin') === 'true');
    const [barbers, setBarbers] = useState(DEFAULT_BARBERS);
    const [selectedBarber, setSelectedBarber] = useState('carlos');
    const [selectedDate, setSelectedDate] = useState(todayString());
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adminView, setAdminView] = useState('schedule');
    const [settings, setSettings] = useState({
        openingHour: '10:00',
        closingHour: '22:00',
        defaultBarberId: 'carlos',
        maxAppointmentsPerBarberPerDay: 17,
        maxAdvanceDays: 7,
        weeklyHours: DEFAULT_WEEKLY_HOURS,
    });
    const [barberSchedule, setBarberSchedule] = useState({
        openingHour: '10:00',
        closingHour: '22:00',
    });
    const [services, setServices] = useState([]);
    const [serviceForm, setServiceForm] = useState(emptyServiceForm);
    const [savingSettings, setSavingSettings] = useState(false);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [savingService, setSavingService] = useState(false);

    const loadSettings = useCallback(async () => {
        try {
            const response = await api.get('/settings');
            setSettings({
                openingHour: response.data?.openingHour || '10:00',
                closingHour: response.data?.closingHour || '22:00',
                defaultBarberId: response.data?.defaultBarberId || 'carlos',
                maxAppointmentsPerBarberPerDay: response.data?.maxAppointmentsPerBarberPerDay || 17,
                maxAdvanceDays: response.data?.maxAdvanceDays || 7,
                weeklyHours: response.data?.weeklyHours || DEFAULT_WEEKLY_HOURS,
            });
        } catch (error) {
            console.error('Error loading settings', error);
        }
    }, []);

    const loadBarbers = useCallback(async () => {
        try {
            const response = await api.get('/barbers');
            if (response.data && response.data.length) {
                setBarbers(response.data);
                setSelectedBarber((current) => current || response.data[0].id);
            }
        } catch (error) {
            console.error('Error loading barbers', error);
        }
    }, []);

    const loadServices = useCallback(async () => {
        try {
            const response = await api.get('/services');
            setServices(response.data || []);
        } catch (error) {
            console.error('Error loading services', error);
        }
    }, []);

    const loadAppointments = useCallback(async (barberId, date = selectedDate) => {
        setLoading(true);
        try {
            const response = await api.get(`/barbers/${barberId}/appointments`, {
                params: { date },
            });
            setAppointments(response.data || []);
        } catch (error) {
            console.error('Error loading appointments', error);
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    const loadBarberSchedule = useCallback(async (barberId) => {
        try {
            const response = await api.get('/barbers');
            const barber = (response.data || []).find((item) => item.id === barberId);
            setBarberSchedule({
                openingHour: barber?.workStart || barber?.openingHour || settings.openingHour,
                closingHour: barber?.workEnd || barber?.closingHour || settings.closingHour,
            });
        } catch (error) {
            console.error('Error loading barber schedule', error);
        }
    }, [settings.openingHour, settings.closingHour]);

    useEffect(() => {
        if (!isAdmin) return;
        loadBarbers();
        loadSettings();
        loadServices();
    }, [isAdmin, loadBarbers, loadSettings, loadServices]);

    useEffect(() => {
        if (!isAdmin) return;
        loadAppointments(selectedBarber, selectedDate);
        loadBarberSchedule(selectedBarber);
    }, [selectedBarber, selectedDate, isAdmin, loadAppointments, loadBarberSchedule]);

    const setWeeklyDayValue = (dayKey, field, value) => {
        setSettings((prev) => ({
            ...prev,
            weeklyHours: {
                ...prev.weeklyHours,
                [dayKey]: {
                    ...(prev.weeklyHours?.[dayKey] || { enabled: true, open: '10:00', close: '22:00' }),
                    [field]: value,
                },
            },
        }));
    };

    const loginAdmin = (event) => {
        event.preventDefault();
        if (String(pin) === '6786') {
            setCookie('admin', 'true', 1);
            setCookie('name', 'Carlos', 1);
            setIsAdmin(true);
            return;
        }
        alert('PIN incorrecto');
    };

    const handleCancel = async (appointmentId, appointment) => {
        const contact = appointment?.clientPhone ? `Teléfono: ${appointment.clientPhone}` : 'Sin teléfono registrado';
        const confirmMessage = `Cancelar la cita de ${appointment?.clientName || 'cliente'}\n${contact}\n\n¿Deseas continuar?`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            await api.delete(`/appointments/${appointmentId}`);
            alert(`Cita cancelada para ${appointment?.clientName || 'cliente'}.`);
            loadAppointments(selectedBarber);
        } catch (error) {
            alert('No se pudo cancelar la cita');
        }
    };

    const formatDateLabel = (dateString) => {
        const date = new Date(`${dateString}T00:00:00`);
        return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const formatTimeLabel = (value) => {
        if (!value) return '';
        const [hours, minutes] = value.split(':').map(Number);
        const suffix = hours >= 12 ? 'PM' : 'AM';
        const normalizedHour = ((hours + 11) % 12) + 1;
        return `${normalizedHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
    };

    const getNextSevenDays = () => {
        const dates = [];
        const base = new Date();
        for (let index = 0; index < 7; index += 1) {
            const nextDate = new Date(base);
            nextDate.setDate(base.getDate() + index);
            const value = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
            dates.push({
                value,
                label: formatDateLabel(value),
                isToday: index === 0,
            });
        }
        return dates;
    };

    const nextSevenDays = getNextSevenDays();

    const saveSettings = async () => {
        try {
            setSavingSettings(true);
            await api.post('/settings', settings);
            alert('Horarios y reglas del negocio actualizadas correctamente');
        } catch (error) {
            alert('No se pudieron guardar los horarios');
        } finally {
            setSavingSettings(false);
        }
    };

    const saveBarberSchedule = async () => {
        try {
            setSavingSchedule(true);
            await api.post(`/barbers/${selectedBarber}/schedule`, barberSchedule);
            alert('Horario personal del barbero guardado correctamente');
        } catch (error) {
            alert('No se pudo guardar el horario personal');
        } finally {
            setSavingSchedule(false);
        }
    };

    const handleServiceFieldChange = (field, value) => {
        setServiceForm((prev) => ({ ...prev, [field]: value }));
    };

    const resetServiceForm = () => setServiceForm(emptyServiceForm);

    const saveService = async () => {
        if (!serviceForm.name.trim()) {
            alert('El nombre del servicio es obligatorio');
            return;
        }

        try {
            setSavingService(true);
            const payload = {
                ...serviceForm,
                name: serviceForm.name.trim(),
                description: serviceForm.description.trim(),
                price: Number(serviceForm.price) || 0,
                durationMinutes: Number(serviceForm.durationMinutes) || 40,
                order: Number(serviceForm.order) || 1,
                link: serviceForm.link?.trim() || '',
            };
            await api.post('/services', payload);
            await loadServices();
            resetServiceForm();
            alert('Servicio guardado correctamente');
        } catch (error) {
            alert('No se pudo guardar el servicio');
        } finally {
            setSavingService(false);
        }
    };

    const editService = (service) => {
        setServiceForm({
            id: service.id,
            name: service.name,
            description: service.description || '',
            price: service.price || 0,
            imageUrl: service.imageUrl || '',
            link: service.link || '',
            durationMinutes: Number(service.durationMinutes) || 40,
            order: service.order || 1,
        });
    };

    const deleteService = async (serviceId) => {
        if (!window.confirm('¿Deseas eliminar este servicio?')) return;
        try {
            await api.delete(`/services/${serviceId}`);
            await loadServices();
            if (serviceForm.id === serviceId) resetServiceForm();
            alert('Servicio eliminado');
        } catch (error) {
            alert('No se pudo eliminar el servicio');
        }
    };

    if (!isAdmin || requirePin) {
        return (
            <div className='admin'>
                <Navbar />
                <div className='admin-container admin-login-wrap'>
                    <form className='admin-login-box' onSubmit={loginAdmin}>
                        <h2>Panel de administración</h2>
                        <p>Ingresa el PIN del administrador</p>
                        <input
                            type='password'
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder='PIN'
                            maxLength={4}
                        />
                        <button type='submit'>Entrar</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className='admin'>
            <Navbar />
            <div className='admin-container'>
                <div className='admin-tabs'>
                    <div className='barber-selector'>
                        <h2>Barberos</h2>
                        <div className='barber-list'>
                            {barbers.map((barber) => (
                                <button
                                    key={barber.id}
                                    className={selectedBarber === barber.id ? 'barber-btn active' : 'barber-btn'}
                                    onClick={() => setSelectedBarber(barber.id)}
                                >
                                    {barber.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className='admin-toolbar'>
                        <button
                            className={adminView === 'schedule' ? 'admin-toggle-btn active' : 'admin-toggle-btn'}
                            onClick={() => setAdminView('schedule')}
                        >
                            Horario
                        </button>
                        <button
                            className={adminView === 'services' ? 'admin-toggle-btn active' : 'admin-toggle-btn'}
                            onClick={() => setAdminView('services')}
                        >
                            Servicios
                        </button>
                    </div>

                    {adminView === 'schedule' ? (
                        <>
                            <div className='admin-config'>
                                {selectedBarber === 'carlos' ? (
                                    <>
                                        <h3>Horario general del negocio</h3>
                                        <div className='config-grid'>
                                            <label>
                                                Apertura general
                                                <input
                                                    type='time'
                                                    value={settings.openingHour}
                                                    onChange={(e) => setSettings({ ...settings, openingHour: e.target.value })}
                                                />
                                            </label>
                                            <label>
                                                Cierre general
                                                <input
                                                    type='time'
                                                    value={settings.closingHour}
                                                    onChange={(e) => setSettings({ ...settings, closingHour: e.target.value })}
                                                />
                                            </label>
                                            <label>
                                                Barbero por defecto
                                                <select
                                                    value={settings.defaultBarberId}
                                                    onChange={(e) => setSettings({ ...settings, defaultBarberId: e.target.value })}
                                                >
                                                    {barbers.map((barber) => (
                                                        <option key={barber.id} value={barber.id}>{barber.name}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label>
                                                Máx. citas por día
                                                <input
                                                    type='number'
                                                    min='1'
                                                    value={settings.maxAppointmentsPerBarberPerDay}
                                                    onChange={(e) => setSettings({ ...settings, maxAppointmentsPerBarberPerDay: Number(e.target.value) || 1 })}
                                                />
                                            </label>
                                            <label>
                                                Días de anticipación
                                                <input
                                                    type='number'
                                                    min='1'
                                                    value={settings.maxAdvanceDays}
                                                    onChange={(e) => setSettings({ ...settings, maxAdvanceDays: Number(e.target.value) || 1 })}
                                                />
                                            </label>
                                        </div>

                                        <div className='weekly-hours'>
                                            <h4>Horario por día de la semana</h4>
                                            {Object.entries(DAY_LABELS).map(([dayKey, label]) => {
                                                const dayConfig = settings.weeklyHours?.[dayKey] || DEFAULT_WEEKLY_HOURS[dayKey];
                                                return (
                                                    <div className='week-row' key={dayKey}>
                                                        <label className='week-toggle'>
                                                            <input
                                                                type='checkbox'
                                                                checked={Boolean(dayConfig?.enabled)}
                                                                onChange={(e) => setWeeklyDayValue(dayKey, 'enabled', e.target.checked)}
                                                            />
                                                            <span>{label}</span>
                                                        </label>
                                                        <input
                                                            type='time'
                                                            value={dayConfig?.open || '10:00'}
                                                            disabled={!dayConfig?.enabled}
                                                            onChange={(e) => setWeeklyDayValue(dayKey, 'open', e.target.value)}
                                                        />
                                                        <input
                                                            type='time'
                                                            value={dayConfig?.close || '22:00'}
                                                            disabled={!dayConfig?.enabled}
                                                            onChange={(e) => setWeeklyDayValue(dayKey, 'close', e.target.value)}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <button className='save-settings-btn' onClick={saveSettings} disabled={savingSettings}>
                                            {savingSettings ? 'Guardando...' : 'Guardar horario del negocio'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h3>Horario personal de {barbers.find((barber) => barber.id === selectedBarber)?.name || 'barbero'}</h3>
                                        <div className='config-grid'>
                                            <label>
                                                Apertura personal
                                                <input
                                                    type='time'
                                                    value={barberSchedule.openingHour}
                                                    onChange={(e) => setBarberSchedule({ ...barberSchedule, openingHour: e.target.value })}
                                                />
                                            </label>
                                            <label>
                                                Cierre personal
                                                <input
                                                    type='time'
                                                    value={barberSchedule.closingHour}
                                                    onChange={(e) => setBarberSchedule({ ...barberSchedule, closingHour: e.target.value })}
                                                />
                                            </label>
                                        </div>
                                        <button className='save-settings-btn' onClick={saveBarberSchedule} disabled={savingSchedule}>
                                            {savingSchedule ? 'Guardando...' : 'Guardar horario personal'}
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className='appointments-list'>
                                <div className='appointments-header'>
                                    <h3>Citas de {barbers.find((barber) => barber.id === selectedBarber)?.name || selectedBarber}</h3>
                                    <div className='date-tabs'>
                                        {nextSevenDays.map((date) => (
                                            <button
                                                key={date.value}
                                                className={selectedDate === date.value ? 'date-tab active' : 'date-tab'}
                                                onClick={() => setSelectedDate(date.value)}
                                            >
                                                {date.isToday ? 'Hoy' : date.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <p className='selected-date-label'>Mostrando: {formatDateLabel(selectedDate)}</p>

                                {loading ? <p>Cargando...</p> : (
                                    appointments.length ? (
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Hora</th>
                                                    <th>Cliente</th>
                                                    <th>Teléfono</th>
                                                    <th>Servicio</th>
                                                    <th>Tiempo</th>
                                                    <th>Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {appointments.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>{formatTimeLabel(item.time)}</td>
                                                        <td>{item.clientName}</td>
                                                        <td>{item.clientPhone}</td>
                                                        <td>{item.serviceName || 'Sin servicio'}</td>
                                                        <td>{Number(item.durationMinutes || 40)} min</td>
                                                        <td>
                                                            <button onClick={() => handleCancel(item.id, item)}>Cancelar</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No hay citas para este barbero en la fecha seleccionada.</p>
                                    )
                                )}
                            </div>
                        </>
                    ) : (
                        <div className='service-manager'>
                            <div className='service-form'>
                                <h3>{serviceForm.id ? 'Editar servicio' : 'Agregar servicio'}</h3>
                                <label>
                                    Nombre
                                    <input value={serviceForm.name} onChange={(e) => handleServiceFieldChange('name', e.target.value)} />
                                </label>
                                <label>
                                    Descripción
                                    <textarea value={serviceForm.description} onChange={(e) => handleServiceFieldChange('description', e.target.value)} />
                                </label>
                                <label>
                                    Precio
                                    <input type='number' value={serviceForm.price} onChange={(e) => handleServiceFieldChange('price', e.target.value)} />
                                </label>
                                <label>
                                    Duración (minutos)
                                    <input type='number' min='10' step='5' value={serviceForm.durationMinutes} onChange={(e) => handleServiceFieldChange('durationMinutes', e.target.value)} />
                                </label>
                                <label>
                                    Imagen (URL opcional)
                                    <input value={serviceForm.imageUrl} onChange={(e) => handleServiceFieldChange('imageUrl', e.target.value)} placeholder='https://...' />
                                </label>
                                <label>
                                    Enlace del corte / galería (opcional)
                                    <input value={serviceForm.link} onChange={(e) => handleServiceFieldChange('link', e.target.value)} placeholder='https://ejemplo.com/corte' />
                                </label>
                                <label>
                                    Orden
                                    <input type='number' value={serviceForm.order} onChange={(e) => handleServiceFieldChange('order', e.target.value)} />
                                </label>
                                <div className='service-actions'>
                                    <button className='save-settings-btn' onClick={saveService} disabled={savingService}>
                                        {savingService ? 'Guardando...' : 'Guardar servicio'}
                                    </button>
                                    {serviceForm.id ? (
                                        <button className='cancel-btn' onClick={resetServiceForm}>Cancelar</button>
                                    ) : null}
                                </div>
                            </div>

                            <div className='service-list'>
                                {services.length ? services.map((service) => (
                                    <div className='service-card' key={service.id}>
                                        <img src={service.imageUrl || 'https://via.placeholder.com/200x140?text=Servicio'} alt={service.name} />
                                        <div>
                                            <h4>{service.name}</h4>
                                            <p>{service.description}</p>
                                            <small>${Number(service.price || 0)}</small>
                                            <p><strong>{Number(service.durationMinutes || 40)} min</strong></p>
                                            <div className='card-actions'>
                                                <button onClick={() => editService(service)}>Editar</button>
                                                <button className='danger' onClick={() => deleteService(service.id)}>Eliminar</button>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p>No hay servicios aún.</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Admin;
