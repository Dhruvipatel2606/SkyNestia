import API from '../api.js';

export const getUser = (userId) => API.get(`/users/${userId}`);
export const getAllUsers = () => API.get('/users');
export const updateUser = (id, formData) => API.put(`/users/update/${id}`, formData);
export const getFollowers = (id) => API.get(`/users/${id}/followers`);
export const getSuggestedUsers = () => API.get('/user/suggested/users');
export const followUser = (id, data) => API.put(`/user/${id}/follow`, data);
export const unfollowUser = (id, data) => API.put(`/user/${id}/unfollow`, data);
