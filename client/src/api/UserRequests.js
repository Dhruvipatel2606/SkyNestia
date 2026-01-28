import API from '../api.js';

export const getUser = (userId) => API.get(`/user/${userId}`);
export const getAllUsers = () => API.get('/user');
export const updateUser = (id, formData) => API.put(`/user/${id}`, formData);
