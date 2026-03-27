import express from 'express';
import { getPrivacyPolicy, getTerms, getCookiePolicy, getCommunityStandards } from '../controllers/LegalController.js';

const router = express.Router();

router.get('/privacy', getPrivacyPolicy);
router.get('/terms', getTerms);
router.get('/cookies', getCookiePolicy);
router.get('/standards', getCommunityStandards);

export default router;
