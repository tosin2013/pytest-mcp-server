import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { fetchFailures } from '../services/api';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    byStatus: { new: 0, in_progress: 0, resolved: 0 },
    byPrinciple: Array(9).fill(0)
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchFailures();
        
        // Calculate stats
        const byStatus = { new: 0, in_progress: 0, resolved: 0 };
        const byPrinciple = Array(9).fill(0);
        
        data.failures.forEach(failure => {
          // Count by status
          byStatus[failure.status] = (byStatus[failure.status] || 0) + 1;
          
          // Count by current principle
          if (failure.current_debug_step && failure.current_debug_step <= 9) {
            byPrinciple[failure.current_debug_step - 1]++;
          }
        });
        
        setStats({
          total: data.total,
          byStatus,
          byPrinciple
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };
    
    loadStats();
  }, []);

  const statusData = {
    labels: ['New', 'In Progress', 'Resolved'],
    datasets: [
      {
        data: [
          stats.byStatus.new || 0,
          stats.byStatus.in_progress || 0,
          stats.byStatus.resolved || 0
        ],
        backgroundColor: ['#ffc107', '#0d6efd', '#198754'],
        borderWidth: 1,
      },
    ],
  };

  const principleData = {
    labels: [
      'Understand the System',
      'Make It Fail',
      'Quit Thinking and Look',
      'Divide and Conquer',
      'Change One Thing at a Time',
      'Keep an Audit Trail',
      'Check the Plug',
      'Get a Fresh View',
      'Verify the Fix'
    ],
    datasets: [
      {
        label: 'Test Failures by Current Principle',
        data: stats.byPrinciple,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    indexAxis: 'y',
    elements: {
      bar: {
        borderWidth: 2,
      },
    },
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Test Failures by Current Debugging Principle',
      },
    },
  };

  return (
    <Container>
      <h1 className="mb-4">Dashboard</h1>
      
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Total Failures</Card.Title>
              <div className="display-1">{stats.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Status Distribution</Card.Title>
              <div style={{ height: '200px' }}>
                <Pie data={statusData} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>Resolution Rate</Card.Title>
              <div className="display-4">
                {stats.total ? Math.round((stats.byStatus.resolved / stats.total) * 100) : 0}%
              </div>
              <Card.Text>of failures resolved</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Bar data={principleData} options={barOptions} height={300} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard; 