import express from 'express';
import { registerUser, loginUser } from '../controllers/AuthController.js';
const router = express.Router();

//response to test route
router.get('/', async(req, res) => {
    res.send('Auth Route is working');
});

router.post('/register', registerUser);
router.post('/login', loginUser);

export default router; 