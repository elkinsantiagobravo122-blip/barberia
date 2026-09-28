import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import Home from './components/Home/Home';
import Admin from './components/Admin/Admin';
import UserProfile from './components/UserProfile/UserProfile';
import Appointment from './components/Appointment/Appointment';
import Services from './components/Home/Services/Services';
import { ProtectedRoute } from './protected.route';
import { AdminRoute } from './admin.route';

import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <Switch>
          <Route path='/' exact component={Home} />
          <Route path='/services' component={Services} />
          <Route path='/appointment' component={Appointment} />
          <AdminRoute component={Admin} path='/admin' />
          <ProtectedRoute component={UserProfile} path='/profile' />
          <Route path='*' component={() => '404 PAGE NOT FOUND'} />
        </Switch>
      </Router>
    </div>
  );
}

export default App;
