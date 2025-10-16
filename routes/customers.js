const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const customers = require('../controllers/customers');

// Temporarily removing authentication for development
router.get('/', customers.getAllCustomers);
router.get('/:id', customers.getCustomerById);

module.exports = router; 