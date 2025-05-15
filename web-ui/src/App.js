import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FailuresList from './components/FailuresList';
import FailureDetail from './components/FailureDetail';
import DebugSession from './components/DebugSession';

function App() {
  return (
    <Container fluid className="p-0">
      <Row className="g-0">
        <Col md={3} lg={2} className="sidebar">
          <Sidebar />
        </Col>
        <Col md={9} lg={10} className="p-3">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/failures" element={<FailuresList />} />
            <Route path="/failures/:id" element={<FailureDetail />} />
            <Route path="/debug/:id" element={<DebugSession />} />
          </Routes>
        </Col>
      </Row>
    </Container>
  );
}

export default App; 