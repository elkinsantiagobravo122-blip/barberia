import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';
import SideNav from '../../SideNav/SideNav';

const Navbar = () => {
    const toggleSideNav = () => {
        const sideNavbar = document.querySelector('.side-navbar');
        const humburger = document.querySelectorAll('.line');

        if (sideNavbar) {
            sideNavbar.classList.toggle('side-navbar-avtive');
        }

        humburger.forEach((line) => {
            line.classList.toggle('humburger-active');
        });
    };

    return (
        <div>
            <SideNav />
            <div className='navbar'>
                <h1 onClick={() => window.location.replace('/')} className='navbar-logo'>
                    Mili Style
                </h1>
                <ul className='navbar-ul'>
                    <li className='nav-items'>
                        <a href='./#hero-navigate' className='links'>Home</a>
                    </li>
                    <li className='nav-items'>
                        <Link className='links' to='/services'>Servicios</Link>
                    </li>
                    <li className='nav-items'>
                        <a href='./#hours-navigate' className='links'>Horarios</a>
                    </li>
                    <li className='nav-items'>
                        <Link className='links' to='/appointment'>Agendar cita</Link>
                    </li>
                    <li className='nav-items'>
                        <Link className='links cp' to='/admin'>Admin</Link>
                    </li>
                </ul>

                <div className='date-and-phone'>
                    <div>
                        <i className='fa fa-phone' aria-hidden='true'></i>
                        <label> 3122209304 </label>
                    </div>
                </div>

                <div className='humburger' onClick={toggleSideNav}>
                    <div className='line'></div>
                    <div className='line'></div>
                    <div className='line'></div>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
