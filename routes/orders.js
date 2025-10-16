const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const orders = require('../controllers/orders');

router.post('/', orders.createOrder);
// Temporarily removing authentication for development
router.get('/', orders.getOrders);
router.patch('/:id/status', orders.updateOrderStatus);
router.get('/customer/:id', orders.getCustomerOrders);

module.exports = router;
