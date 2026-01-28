import API from '../api.js';

export const getUser = (userId) => API.get(`/user/${userId}`);
export const getAllUsers = () => API.get('/user');
export const updateUser = (id, formData) => API.put(`/user/${id}`, formData);

import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000" });

export const getFollowers = (id) =>
    API.get(`/user/${id}/followers`);
