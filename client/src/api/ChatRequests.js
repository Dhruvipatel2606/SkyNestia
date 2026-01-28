import API from '../api.js';

export const userChats = (userId) => API.get(`/chat/${userId}`);
export const findChat = (firstId, secondId) => API.get(`/chat/find/${firstId}/${secondId}`);
export const createChat = (senderId, receiverId) => API.post('/chat', { senderId, receiverId });

export const getUserChats = (id) =>
    API.get(`/chat/${id}`);
