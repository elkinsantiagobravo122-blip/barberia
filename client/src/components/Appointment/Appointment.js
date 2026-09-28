import React, { useState, useEffect } from 'react';
import './Appointment.css';
import Navbar from '../Home/Navbar/Navbar';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ErrorMsg from '../ErrorMsg/ErrorMsg';
import { api } from '../../api';

const Appointment = (props) => {
    const [startDate, setStartDate] = useState(null);
    const [userTime, setUserTime] = useState('');
    const [userDate, setUserDate] = useState('');
    const [clientName, setClientName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [settings, setSettings] = useState({
        openingHour: '10:00',
        closingHour: '22:00',
        defaultBarberId: 'carlos',
    });
    const [barbers, setBarbers] = useState([]);
    const [services, setServices] = useState([]);
    const [barberId, setBarberId] = useState('carlos');
    const [serviceId, setServiceId] = useState('');
    const [availability, setAvailability] = useState([]);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const service = services.find((item) => item.id === serviceId) || services[0];
    const barber = barbers.find((item) => item.id === barberId) || barbers[0];

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await api.get('/settings');
                const data = response.data || { openingHour: '10:00', closingHour: '22:00', defaultBarberId: 'carlos' };
                setSettings(data);
                setBarberId(data.defaultBarberId || 'carlos');
            } catch (error) {
                console.error('Error loading settings', error);
            }
        };

        const loadBarbers = async () => {
            try {
                const response = await api.get('/barbers');
                const list = response.data || [];
                setBarbers(list);
                if (list.length) {
                    setBarberId((current) => current || list[0].id);
                }
            } catch (error) {
                console.error('Error loading barbers', error);
            }
        };

        const loadServices = async () => {
            try {
                const response = await api.get('/services');
                const list = response.data || [];
                setServices(list);
                if (!list.length) {
                    setServiceId('');
                    return;
                }

                setServiceId((current) => {
                    if (current && list.some((service) => service.id === current)) {
                        return current;
                    }
                    return list[0].id;
                });
            } catch (error) {
                console.error('Error loading services', error);
            }
        };

        loadSettings();
        loadBarbers();
        loadServices();
    }, []);

    useEffect(() => {
        if (!userDate || !barberId || !serviceId) {
            setAvailability([]);
            setUserTime('');
            setAvailabilityLoading(false);
            return;
        }

        const loadAvailability = async () => {
            setAvailabilityLoading(true);
            try {
                const serviceDurationMinutes = Number(service?.durationMinutes) || 40;
                const response = await api.get('/appointments/availability', {
                    params: {
                        barberId,
                        date: userDate,
                        serviceDurationMinutes,
                    },
                });
                const times = response.data.availableTimes || [];
                setAvailability(times);
                setUserTime((current) => (times.includes(current) ? current : ''));
            } catch (error) {
                console.error('Error loading availability', error);
                setAvailability([]);
                setUserTime('');
            } finally {
                setAvailabilityLoading(false);
            }
        };

        loadAvailability();
    }, [barberId, userDate, serviceId, service]);

    useEffect(() => {
        if (userTime && availability.length && !availability.includes(userTime)) {
            setUserTime('');
        }
    }, [availability, userTime]);

    const formatTimeLabel = (value) => {
        if (!value) return '';
        const [hours, minutes] = value.split(':').map(Number);
        const suffix = hours >= 12 ? 'PM' : 'AM';
        const normalizedHour = ((hours + 11) % 12) + 1;
        return `${normalizedHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
    };

    const timeOptions = availability.map((slot) => ({ value: slot, label: formatTimeLabel(slot) }));
    const selectedServiceDuration = Number(service?.durationMinutes) || 40;
    const isFormReady = Boolean(clientName && userDate && userTime && phone && serviceId && barberId);
    const availabilityHint = availabilityLoading
        ? 'Cargando horarios disponibles...'
        : availability.length
            ? `Horarios libres para ${service?.name || 'este servicio'} · ${selectedServiceDuration} min`
            : 'No hay horarios disponibles para este barbero en la fecha seleccionada. Prueba otra fecha o cambia de barbero.';

    const makeAppointment = async () => {
        if (!clientName.trim()) {
            const message = 'Falta poner tu nombre para agendar la cita.';
            setError(message);
            setSuccess('');
            alert(message);
            return;
        }

        if (!userDate) {
            const message = 'Selecciona una fecha antes de reservar el horario.';
            setError(message);
            setSuccess('');
            alert(message);
            return;
        }

        if (!userTime) {
            const message = 'Selecciona un horario disponible antes de agendar la cita.';
            setError(message);
            setSuccess('');
            alert(message);
            return;
        }

        if (!phone.trim()) {
            const message = 'Falta tu número de teléfono para poder agendar la cita.';
            setError(message);
            setSuccess('');
            alert(message);
            return;
        }

        if (!serviceId) {
            const message = 'Selecciona un servicio para continuar.';
            setError(message);
            setSuccess('');
            alert(message);
            return;
        }

        if (!barberId) {
            const message = 'Selecciona un barbero para continuar.';
            setError(message);
            setSuccess('');
            alert(message);
            return;
        }

        if (!availability.includes(userTime)) {
            const message = 'El horario seleccionado ya no está disponible. Elige otro.';
            setError(message);
            setSuccess('');
            alert(message);
            return;
        }

        try {
            setError('');
            setSuccess('');

            const payload = {
                clientName: clientName.trim(),
                clientPhone: phone.trim(),
                customerEmail: '',
                barberId,
                barberName: barber?.name || 'Barbero',
                serviceId,
                serviceName: service?.name || 'Servicio',
                date: userDate,
                time: userTime,
                durationMinutes: Number(service?.durationMinutes) || 40,
                notes: '',
            };

            const response = await api.post('/appointments', payload);
            if (response.data && response.data.message) {
                const successMessage = 'Cita creada correctamente.';
                setSuccess(`${successMessage} Redirigiendo a la página principal...`);
                alert(successMessage);
                setTimeout(() => {
                    if (props.history && props.history.push) {
                        props.history.push('/');
                    } else {
                        window.location.href = '/';
                    }
                }, 1200);
            }
        } catch (error) {
            const message = error?.response?.data?.error || 'No se pudo agendar la cita';
            setSuccess('');
            setError(message);
            alert(message);
        }
    };

    const handleTimeChange = (event) => {
        setUserTime(event.target.value);
        setError('');
    };

    const handleDateChange = (date) => {
        if (!date) {
            setUserDate('');
            setStartDate(null);
            setUserTime('');
            setError('');
            setSuccess('');
            return;
        }

        const tmp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        setUserDate(tmp);
        setStartDate(date);
        setUserTime('');
        setError('');
        setSuccess('');
    };

    return (
        <div>
            <Navbar />
            <div className='appointment-container'>
                <div className='appointment-form'>
                    <h1>Agendar cita</h1>
                    <div className='appointment-inner-container'>
                        {error !== '' ? <ErrorMsg info={error} /> : ''}
                        {success !== '' ? <div className='success-message'>{success}</div> : ''}

                        <p>Tu nombre:<span className='red-astrix'>*</span></p>
                        <input
                            type='text'
                            className='phone-input'
                            placeholder='Escribe tu nombre'
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                        />
                    </div>

                    <div className='appointment-inner-container'>
                        <p>Selecciona barbero:<span className='red-astrix'>*</span></p>
                        <select className='date-picker' value={barberId} onChange={(e) => {
                            setBarberId(e.target.value);
                            setError('');
                            setSuccess('');
                            setUserTime('');
                        }}>
                            {barbers.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                        <div className='availability-note'>Horario del barbero: {barber?.workStart || settings.openingHour} - {barber?.workEnd || settings.closingHour}</div>
                    </div>

                    <div className='appointment-inner-container'>
                        <p>Servicio:<span className='red-astrix'>*</span></p>
                        <select className='date-picker' value={serviceId} onChange={(e) => {
                            setServiceId(e.target.value);
                            setError('');
                            setSuccess('');
                            setUserTime('');
                        }}>
                            {services.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                        <div className='availability-note'>Duración estimada: {selectedServiceDuration} min</div>
                    </div>

                    <div className='appointment-inner-container'>
                        <p>Selecciona fecha:<span className='red-astrix'>*</span></p>
                        <DatePicker
                            selected={startDate}
                            onChange={handleDateChange}
                            withPortal
                            className='date-picker'
                            dateFormat='dd/MM/yyyy'
                            minDate={new Date()}
                            placeholderText='Selecciona una fecha'
                            onCalendarOpen={() => setError('')}
                        />
                    </div>

                    <div className='appointment-inner-container'>
                        <p>Horario disponible:<span className='red-astrix'>*</span></p>
                        <select
                            className='date-picker'
                            value={userTime}
                            onChange={handleTimeChange}
                            disabled={availabilityLoading || !userDate || !availability.length}
                        >
                            <option value=''>
                                {!userDate
                                    ? 'Primero selecciona una fecha'
                                    : (availabilityLoading ? 'Cargando horarios...' : (availability.length ? 'Elige horario' : 'Sin horarios disponibles'))}
                            </option>
                            {timeOptions.map((slot) => (
                                <option key={slot.value} value={slot.value}>{slot.label}</option>
                            ))}
                        </select>
                        <div className={`availability-note ${availabilityLoading ? '' : (availability.length ? 'is-ok' : 'is-empty')}`}>
                            {availabilityHint}
                        </div>
                    </div>

                    <div id='appo-phone' className='appointment-inner-container'>
                        <p>Teléfono:<span className='red-astrix'>*</span></p>
                        <input
                            type='tel'
                            className='phone-input'
                            placeholder='Tu teléfono'
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <div id='make-btn' className='appointment-inner-container'>
                        <button
                            onClick={makeAppointment}
                            className='appointment-btn'
                            disabled={(!isFormReady || (userTime !== '' && !availability.includes(userTime)))}
                        >
                            Enviar
                        </button>
                    </div>

                    <div className='appointment-data appointment-data-show'>
                        <h3>Resumen</h3>
                        <p>Nombre: <span>{clientName || 'Sin nombre'}</span></p>
                        <p>Barbero: <span>{barber?.name || 'Sin seleccionar'}</span></p>
                        <p>Servicio: <span>{service?.name || 'Sin seleccionar'}</span></p>
                        <p>Duración: <span>{selectedServiceDuration} minutos</span></p>
                        <p>Fecha: <span>{userDate || 'Sin seleccionar'}</span></p>
                        <p>Hora: <span>{userTime ? formatTimeLabel(userTime) : 'Sin seleccionar'}</span></p>
                        <p>Teléfono: <span>{phone || 'Sin teléfono'}</span></p>
                        <p>Horario del barbero: <span>{barber?.workStart || settings.openingHour} - {barber?.workEnd || settings.closingHour}</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Appointment;
