export const API_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '/api'
  : 'http://localhost:3001/api';


