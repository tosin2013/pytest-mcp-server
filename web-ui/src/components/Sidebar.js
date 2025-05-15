import React from 'react';
import { NavLink } from 'react-router-dom';
import { Nav } from 'react-bootstrap';

const Sidebar = () => {
  return (
    <div className="d-flex flex-column p-3 text-white h-100">
      <h1 className="fs-4 mb-4">Pytest MCP</h1>
      <Nav className="flex-column mb-auto">
        <Nav.Item>
          <NavLink to="/" className={({isActive}) => 
            `nav-link text-white ${isActive ? 'active' : ''}`
          }>
            Dashboard
          </NavLink>
        </Nav.Item>
        <Nav.Item>
          <NavLink to="/failures" className={({isActive}) => 
            `nav-link text-white ${isActive ? 'active' : ''}`
          }>
            Test Failures
          </NavLink>
        </Nav.Item>
      </Nav>
      <div className="mt-auto text-center">
        <small className="text-white-50">
          Using 9 Debugging Principles
        </small>
      </div>
    </div>
  );
};

export default Sidebar; 