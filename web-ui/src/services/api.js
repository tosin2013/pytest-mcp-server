import axios from 'axios';

const API_URL = '/api';

export const fetchFailures = async (status = '') => {
  try {
    const url = status ? `${API_URL}/failures?status=${status}` : `${API_URL}/failures`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching failures:', error);
    throw error;
  }
};

export const fetchFailureDetails = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/failures/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching failure ${id}:`, error);
    throw error;
  }
};

export const applyDebugPrinciple = async (failureId, principleNumber, analysis) => {
  try {
    const response = await axios.post(`${API_URL}/debug`, {
      failure_id: failureId,
      principle_number: principleNumber,
      analysis
    });
    return response.data;
  } catch (error) {
    console.error('Error applying debug principle:', error);
    throw error;
  }
};

export const registerFailure = async (failureData) => {
  try {
    const response = await axios.post(`${API_URL}/failures`, failureData);
    return response.data;
  } catch (error) {
    console.error('Error registering failure:', error);
    throw error;
  }
}; 