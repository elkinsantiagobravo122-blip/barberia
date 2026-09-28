import React from 'react';
import './Hero.css';
import { Link } from 'react-router-dom';

const Hero = () => {
    return (
        <div className='hero' id='hero-navigate'>
            <div className='hero-text'>
                <h1 className='hero-h1'>Mili Style</h1>
                <div className='hero-para-div'>
                    <p className='hero-para'>
                        Cortes modernos, recorte de barba y estilo premium para que luzcas con confianza
                        en cada detalle.
                    </p>
                </div>
                <Link to='/appointment'>
                    <button className='hero-btn'>Reservar cita</button>
                </Link>
            </div>
        </div>
    );
};

export default Hero;
