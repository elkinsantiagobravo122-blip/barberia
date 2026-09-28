import React, { useState, useEffect } from 'react';
import './Hours.css';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

const Hours = () => {
    const [day, setDay] = useState(0);
    const [settings, setSettings] = useState({ openingHour: '10:00', closingHour: '22:00' });

    useEffect(() => {
        const today = new Date();
        setDay(today.getDay());

        const loadSettings = async () => {
            try {
                const response = await api.get('/settings');
                setSettings(response.data || { openingHour: '10:00', closingHour: '22:00' });
            } catch (error) {
                console.error('Error loading settings', error);
            }
        };

        loadSettings();
    }, []);

    return (
        <div className='hours' id='hours-navigate'>
            <div className='hours-container'>
                <h1>Horario de atención</h1>
                <div className='hours-flex'>
                    <div className={day === 0 ? `active-day hours-box ` : `not-active-day hours-box `}>
                        <h2>Dom</h2>
                        <p>{settings.openingHour} a {settings.closingHour}</p>
                    </div>
                    <div className={day === 1 ? `active-day hours-box ` : `not-active-day hours-box `}>
                        <h2>Lun</h2>
                        <p>{settings.openingHour} a {settings.closingHour}</p>
                    </div>
                    <div className={day === 2 ? `active-day hours-box ` : `not-active-day hours-box `}>
                        <h2>Mar</h2>
                        <p>{settings.openingHour} a {settings.closingHour}</p>
                    </div>
                    <div className={day === 3 ? `active-day hours-box ` : `not-active-day hours-box `}>
                        <h2>Mié</h2>
                        <p>{settings.openingHour} a {settings.closingHour}</p>
                    </div>
                    <div className={day === 4 ? `active-day hours-box ` : `not-active-day hours-box `}>
                        <h2>Jue</h2>
                        <p>{settings.openingHour} a {settings.closingHour}</p>
                    </div>
                    <div className={day === 5 ? `active-day hours-box ` : `not-active-day hours-box `}>
                        <h2>Vie</h2>
                        <p>{settings.openingHour} a {settings.closingHour}</p>
                    </div>
                    <div className={day === 6 ? `active-day hours-box ` : `not-active-day hours-box `}>
                        <h2>Sáb</h2>
                        <p className='text-center'>Horario global definido por Carlos</p>
                    </div>
                </div>
                <div className='hours-btn-div'>
                    <Link to='/appointment'>
                        <button className='hours-btn'>Reservar ahora</button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Hours;
