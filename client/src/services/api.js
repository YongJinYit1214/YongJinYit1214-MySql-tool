import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Database operations
export const getDatabases = async () => {
  const response = await api.get('/databases');
  return response.data;
};

export const createDatabase = async (databaseName) => {
  const response = await api.post('/databases', { databaseName });
  return response.data;
};

export const deleteDatabase = async (databaseName) => {
  const response = await api.delete(`/databases/${databaseName}`);
  return response.data;
};

export const useDatabase = async (database) => {
  const response = await api.post('/use-database', { database });
  return response.data;
};

// Table operations
export const getTables = async () => {
  const response = await api.get('/tables');
  return response.data;
};

export const getTableStructure = async (tableName) => {
  const response = await api.get(`/tables/${tableName}/structure`);
  return response.data;
};

export const getReferencedData = async (tableName, columnName) => {
  const response = await api.get(`/tables/${tableName}/referenced-data/${columnName}`);
  return response.data;
};

export const getTableData = async (tableName, params = {}) => {
  const { page = 1, limit = 100, sort, order, filter } = params;

  let url = `/tables/${tableName}/data?page=${page}&limit=${limit}`;

  if (sort && order) {
    url += `&sort=${sort}&order=${order}`;
  }

  if (filter) {
    url += `&filter=${JSON.stringify(filter)}`;
  }

  const response = await api.get(url);
  return response.data;
};

// Data manipulation
export const updateRecord = async (tableName, id, data, force = false) => {
  const url = force
    ? `/tables/${tableName}/data/${id}?force=true`
    : `/tables/${tableName}/data/${id}`;

  const response = await api.put(url, data);
  return response.data;
};

export const createRecord = async (tableName, data, relatedRecords = null) => {
  const payload = relatedRecords
    ? { data, relatedRecords }
    : data;

  const response = await api.post(`/tables/${tableName}/data`, payload);
  return response.data;
};

export const deleteRecord = async (tableName, id, force = false) => {
  const url = force
    ? `/tables/${tableName}/data/${id}?force=true`
    : `/tables/${tableName}/data/${id}`;

  const response = await api.delete(url);
  return response.data;
};

// Custom query
export const executeQuery = async (query) => {
  const response = await api.post('/query', { query });
  return response.data;
};

export default api;
