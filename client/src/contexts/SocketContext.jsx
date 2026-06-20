import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : `${window.location.protocol}//${window.location.hostname}:5000`);

    socketRef.current = io(socketUrl, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });


    socketRef.current.on('connect', () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  const joinVillage = (villageId) => socketRef.current?.emit('join:village', villageId);
  const joinSource = (sourceId) => socketRef.current?.emit('join:source', sourceId);
  const on = (event, handler) => { socketRef.current?.on(event, handler); };
  const off = (event, handler) => { socketRef.current?.off(event, handler); };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, joinVillage, joinSource, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
