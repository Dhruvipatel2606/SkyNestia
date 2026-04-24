import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, userId }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (!userId) return;

        // Use the current host to ensure it works on other devices in the same network
        const socketUrl = `http://${window.location.hostname}:5002`; 
        console.log("Connecting to socket at:", socketUrl);
        const newSocket = io(socketUrl, {
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });

        newSocket.on("connect", () => {
            console.log("Socket connected successfully with ID:", newSocket.id);
            newSocket.emit("new-user-add", userId);
        });

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
