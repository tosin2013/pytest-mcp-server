import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, ProgressBar, Alert } from 'react-bootstrap';
import { fetchFailureDetails, applyDebugPrinciple } from '../services/api';

const DebugSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [failure, setFailure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisText, setAnalysisText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleAnalysisSubmit = async (e) => {
    e.preventDefault();
    if (!analysisText.trim()) {
      setError('Analysis text cannot be empty');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    try {
      const result = await applyDebugPrinciple(
        id, 
        failure.debugging.current_principle.number, 
        analysisText
      );
      
      // Update the failure details to show new principle
      const updatedFailure = await fetchFailureDetails(id);
      setFailure(updatedFailure);
      
      setAnalysisText('');
      setSuccessMessage(`Successfully applied principle ${result.current_principle.number}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error applying debug principle:', error);
      setError('Failed to apply debugging principle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Container><p>Loading debug session...</p></Container>;
  }

  if (error && !failure) {
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
  const { current_principle, completed_principles, pending_principles, progress } = debugging;

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Debug Session</h1>
        <div>
          <Button 
            variant="outline-primary" 
            className="me-2"
            onClick={() => navigate(`/failures/${id}`)}
          >
            Back to Failure Details
          </Button>
        </div>
      </div>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>{failureData.test_name}</Card.Title>
              <Card.Text className="text-danger">
                {failureData.error_message}
              </Card.Text>
              <div className="d-grid">
                <Button 
                  variant="outline-secondary"
                  onClick={() => navigate(`/failures/${id}`)}
                >
                  View Details
                </Button>
              </div>
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Body>
              <Card.Title>Debugging Progress</Card.Title>
              <ProgressBar 
                now={progress.percentage} 
                label={`${progress.percentage}%`} 
                className="mb-3" 
                variant="success"
              />
              <p className="text-center mb-0">
                {progress.completed} of 9 principles applied
              </p>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={8}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Current Principle: #{current_principle.number} - {current_principle.name}</Card.Title>
              <Card.Text>{current_principle.description}</Card.Text>
              <div className="bg-light p-3 rounded mb-3">
                <strong>Prompt:</strong> {current_principle.prompt}
              </div>
              
              {error && <Alert variant="danger">{error}</Alert>}
              {successMessage && <Alert variant="success">{successMessage}</Alert>}
              
              <Form onSubmit={handleAnalysisSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Your Analysis:</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={6} 
                    value={analysisText}
                    onChange={(e) => setAnalysisText(e.target.value)}
                    placeholder="Apply this debugging principle to the test failure..."
                    disabled={submitting}
                  />
                </Form.Group>
                <div className="d-grid">
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? 'Applying Principle...' : 'Apply Principle'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
          
          <h4>Debugging Process</h4>
          {completed_principles.length > 0 && (
            <div className="mb-4">
              <h5>Completed Principles</h5>
              {completed_principles.map(step => (
                <div key={step.number} className="debug-principle completed">
                  <h5>#{step.number}: {step.name}</h5>
                  <p>{step.analysis}</p>
                </div>
              ))}
            </div>
          )}
          
          <div className="debug-principle current">
            <h5>#{current_principle.number}: {current_principle.name} (Current)</h5>
            <p>{current_principle.description}</p>
          </div>
          
          {pending_principles.length > 0 && (
            <div className="mt-4">
              <h5>Upcoming Principles</h5>
              {pending_principles
                .filter(p => p.number !== current_principle.number)
                .map(step => (
                <div key={step.number} className="debug-principle pending">
                  <h5>#{step.number}: {step.name}</h5>
                </div>
              ))}
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default DebugSession; 