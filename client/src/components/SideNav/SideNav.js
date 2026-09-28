import React from 'react';
import './SideNav.css';
import { Link } from 'react-router-dom';

const SideNav = () => {
    return (
        <div className='side-navbar'>
            <h1 className=''>Mili Style</h1>
            <div className='side-navbar-info'>
                <div className='side-nav-info'>
                    <i className='fa fa-phone' aria-hidden='true'></i>
                    <label> 3122209304 </label>
                </div>
            </div>
            <ul className='side-navbar-ul'>
                <li className=''>
                    <i className='fa fa-home' aria-hidden='true'></i>
                    <a href='./#hero-navigate' className='links'>Inicio</a>
                </li>
                <li className=''>
                    <i className='fa fa-camera' aria-hidden='true'></i>
                    <a href='./#what-we-do' className='links'>Servicios</a>
                </li>
                <li className=''>
                    <i className='fa fa-clock-o' aria-hidden='true'></i>
                    <a href='./#hours-navigate' className='links'>Horarios</a>
                </li>
                <li id='control-panel' className='nav-items'>
                    <Link className='links side-cp' to='/admin'>Admin</Link>
                </li>
                <li id='user-profile' className='nav-items'>
                    <Link className='links side-up' to='/appointment'>Agendar cita</Link>
                </li>
            </ul>
        </div>
    );
};

export default SideNav;
