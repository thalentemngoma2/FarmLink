import { Platform } from 'react-native';

// Update this IP address if your local network assigns a different one to your computer.
const LOCAL_IP = '192.168.8.143';
const PORT = '3000';

export const API_BASE = Platform.OS === 'web' 
  ? `http://localhost:${PORT}` 
  : `http://${LOCAL_IP}:${PORT}`;

export default function ApiRoute() {
  return null;
}