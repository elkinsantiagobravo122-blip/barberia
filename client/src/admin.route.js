import React from 'react';
import { Route } from 'react-router-dom';
import { getCookie } from './cookies';

export const AdminRoute = ({ component: Components, ...rest }) => {
  return (
    <Route
      {...rest}
      render={(props) => {
        const isAdmin = getCookie('admin') === 'true';
        return <Components {...props} requirePin={!isAdmin} />;
      }}
    />
  );
};


