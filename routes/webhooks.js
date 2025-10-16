const express = require('express');
const router = express.Router();
const webhooks = require('../controllers/webhooks');
router.post('/paystack', webhooks.handlePaystackWebhook);
module.exports = router;
