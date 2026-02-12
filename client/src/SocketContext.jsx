import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, userId }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (!userId) return;

        // Ensure we connect to the correct backend URL
        const socketUrl = "http://localhost:5000"; // API.defaults.baseURL.replace('/api', '') could be better but sticking to port 5000 for now as it matches server
        const newSocket = io(socketUrl);

        newSocket.emit("new-user-add", userId);
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [userId]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
