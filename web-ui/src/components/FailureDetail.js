import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, ProgressBar } from 'react-bootstrap';
import { fetchFailureDetails } from '../services/api';

const FailureDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [failure, setFailure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFailureDetails = async () => {
      setLoading(true);
      try {
        const data = await fetchFailureDetails(id);
        setFailure(data);
      } catch (error) {
        console.error(`Failed to load failure ${id}:`, error);
        setError('Failed to load failure details. The failure may not exist.');
      } finally {
        setLoading(false);
      }
    };
    
    loadFailureDetails();
  }, [id]);

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

  if (loading) {
    return <Container><p>Loading failure details...</p></Container>;
  }

  if (error) {
    return (
      <Container>
        <Card className="text-center p-5">
          <Card.Body>
            <Card.Title>Error</Card.Title>
            <Card.Text>{error}</Card.Text>
            <Button variant="primary" onClick={() => navigate('/failures')}>
              Back to Failures List
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (!failure) {
    return (
      <Container>
        <Card className="text-center p-5">
          <Card.Body>
            <Card.Title>Failure Not Found</Card.Title>
            <Card.Text>The requested test failure could not be found.</Card.Text>
            <Button variant="primary" onClick={() => navigate('/failures')}>
              Back to Failures List
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  const { failure: failureData, debugging } = failure;
  const { current_principle, progress } = debugging;

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Test Failure Details</h1>
        <div>
          <Button 
            variant="outline-primary" 
            className="me-2"
            onClick={() => navigate('/failures')}
          >
            Back to List
          </Button>
          <Button 
            variant="primary"
            onClick={() => navigate(`/debug/${id}`)}
          >
            Debug This Failure
          </Button>
        </div>
      </div>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <div>
                  <h3>{failureData.test_name}</h3>
                  <div>{failureData.file_path}:{failureData.line_number}</div>
                </div>
                <div className="text-end">
                  {getStatusBadge(failureData.status)}
                  <div className="mt-2 text-muted">
                    {formatTimestamp(failureData.timestamp)}
                  </div>
                </div>
              </div>
              
              <Card.Text className="text-danger fw-bold mb-3">
                {failureData.error_message}
              </Card.Text>
              
              <h5>Traceback</h5>
              <div className="traceback-container mb-3">
                {failureData.traceback}
              </div>
              
              {failureData.locals && (
                <>
                  <h5>Local Variables</h5>
                  <pre className="bg-light p-3 rounded">
                    {JSON.stringify(failureData.locals, null, 2)}
                  </pre>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Body>
              <h3>Debugging Progress</h3>
              
              <ProgressBar 
                now={progress.percentage} 
                label={`${progress.percentage}%`} 
                className="mb-4" 
                variant="success"
              />
              
              <h5>Current Debugging Principle: #{current_principle.number} - {current_principle.name}</h5>
              <p>{current_principle.description}</p>
              
              <Button 
                variant="primary" 
                onClick={() => navigate(`/debug/${id}`)}
                className="mt-3"
              >
                Continue Debugging
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default FailureDetail; 