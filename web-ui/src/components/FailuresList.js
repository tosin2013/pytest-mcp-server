import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { fetchFailures } from '../services/api';

const FailuresList = () => {
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadFailures = async () => {
      setLoading(true);
      try {
        const data = await fetchFailures(statusFilter);
        setFailures(data.failures || []);
      } catch (error) {
        console.error('Failed to load failures:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadFailures();
  }, [statusFilter]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <Badge bg="warning">New</Badge>;
      case 'in_progress':
        return <Badge bg="primary">In Progress</Badge>;
      case 'resolved':
        return <Badge bg="success">Resolved</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const handleCardClick = (id) => {
    navigate(`/failures/${id}`);
  };

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Test Failures</h1>
        <Form.Select 
          style={{ width: '200px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </Form.Select>
      </div>
      
      {loading ? (
        <p>Loading failures...</p>
      ) : failures.length === 0 ? (
        <Card className="text-center p-5">
          <Card.Body>
            <Card.Title>No Failures Found</Card.Title>
            <Card.Text>
              {statusFilter 
                ? `No test failures with status "${statusFilter}" have been registered.` 
                : "No test failures have been registered yet."}
            </Card.Text>
            <Button variant="primary" onClick={() => navigate('/')}>
              Back to Dashboard
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {failures.map((failure) => (
            <Col key={failure.id} md={6} lg={4} className="mb-4">
              <Card 
                className="h-100 failure-card" 
                onClick={() => handleCardClick(failure.id)}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between mb-2">
                    {getStatusBadge(failure.status)}
                    <small className="text-muted">
                      Step {failure.current_debug_step}/9
                    </small>
                  </div>
                  <Card.Title>{failure.test_name}</Card.Title>
                  <Card.Text className="text-danger">
                    {failure.error_message.length > 100 
                      ? `${failure.error_message.substring(0, 100)}...` 
                      : failure.error_message}
                  </Card.Text>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted">{failure.file_path}</small>
                    <small className="text-muted">{formatTimestamp(failure.timestamp)}</small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default FailuresList; 