import API from '../api.js';

export const getUser = (userId) => API.get(`/users/${userId}`);
export const getAllUsers = () => API.get('/users');
export const updateUser = (id, formData) => API.put(`/users/update/${id}`, formData);
export const getFollowers = (id) => API.get(`/users/${id}/followers`);
