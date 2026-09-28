import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/logo.png';
import './Services.css';
import { api } from '../../../api';

const Services = () => {
    const [services, setServices] = useState([]);

    useEffect(() => {
        const loadServices = async () => {
            try {
                const response = await api.get('/services');
                setServices(response.data || []);
            } catch (error) {
                console.error('Error loading services', error);
            }
        };

        loadServices();
    }, []);

    return (
        <div className='services' id='what-we-do'>
            <div className='services-container'>
                <div className='services-topbar'>
                    <Link to='/' className='back-home-link'>← Volver a inicio</Link>
                </div>
                <div className='services-info'>
                    <img src={logo} alt=''></img>
                    <h1>¿Qué hacemos?</h1>
                    <p className='mr-bottom services-para'>Cortes modernos, mantenimiento de barba y estilo profesional.</p>
                    <p className='mr-bottom services-para'>Todos nuestros servicios se actualizan desde el panel de administración.</p>
                </div>

                <div className='services-grid'>
                    {services.length ? services.map((service) => {
                        const cardContent = (
                            <>
                                <img src={service.imageUrl || logo} alt={service.name}></img>
                                <h2>{service.name}</h2>
                                {service.description ? <p className='mr-bottom services-para'>{service.description}</p> : null}
                                {service.price ? <p className='mr-bottom services-para'>Precio: ${service.price}</p> : null}
                                {service.link ? <p className='mr-bottom services-para service-link'>Ver corte</p> : null}
                            </>
                        );

                        return (
                            <div className='services-box' key={service.id}>
                                {service.link ? (
                                    <a href={service.link} target='_blank' rel='noopener noreferrer' className='service-card-link'>
                                        {cardContent}
                                    </a>
                                ) : (
                                    cardContent
                                )}
                            </div>
                        );
                    }) : (
                        <div className='services-box'>
                            <img src={logo} alt='default service'></img>
                            <h2>Servicio</h2>
                            <p className='mr-bottom services-para'>No hay servicios disponibles en este momento.</p>
                        </div>
                    )}
                </div>

                <div className='services-contact'>
                    <h3>¿Tienes dudas sobre nuestros servicios?</h3>
                    <p>Contáctanos para más información o para agendar tu cita.</p>
                    <a href='tel:3122209304'>3122209304</a>
                </div>
            </div>
        </div>
    );
};

export default Services;
