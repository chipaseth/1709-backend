const pool = require('../models/db');
const secret = process.env.PG_CRYPTO_KEY || 'default-secret-key-for-development';

exports.createOrder = async (req, res) => {
  console.log('=== ORDER CREATION STARTED ===');
  console.log('Received order:', req.body);
  const { email, name, phone, address, items, total, payment_reference } = req.body;
  
  if (!email || !name || !phone || !address || !items || !total) {
    console.error('Missing required fields:', { email, name, phone, address: !!address, items: !!items, total });
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    console.log('Creating/updating customer...');
    // Upsert customer - handle encryption errors gracefully
    let customerRes;
    try {
      customerRes = await pool.query(
        `INSERT INTO customers (name, email, phone, address)
         VALUES ($1, $2, pgp_sym_encrypt($3, $4), pgp_sym_encrypt($5, $4))
         ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [name, email, phone, secret, JSON.stringify(address), secret]
      );
    } catch (encryptError) {
      console.error('Encryption error, trying without encryption:', encryptError.message);
      // Fallback: store without encryption
      customerRes = await pool.query(
        `INSERT INTO customers (name, email, phone, address)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [name, email, phone, JSON.stringify(address)]
      );
    }
    
    const customerId = customerRes.rows[0].id;
    console.log('Customer created/updated with ID:', customerId);
    
    console.log('Creating order...');
    // Create order
    const orderRes = await pool.query(
      `INSERT INTO orders (customer_id, items, total, payment_reference)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [customerId, JSON.stringify(items), total, payment_reference]
    );
    console.log('Order created with ID:', orderRes.rows[0].id);
    console.log('=== ORDER CREATION COMPLETED ===');
    res.status(201).json(orderRes.rows[0]);
  } catch (err) {
    console.error('=== ORDER CREATION FAILED ===');
    console.error('Error creating order:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    console.log('Getting orders...');
    const { status } = req.query;
    let query = `SELECT o.*, c.name as customer_name FROM orders o JOIN customers c ON o.customer_id = c.id`;
    if (status) query += ` WHERE o.status = $1`;
    query += ` ORDER BY o.created_at DESC`;
    const result = await pool.query(query, status ? [status] : []);
    console.log('Orders found:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in getOrders:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await pool.query(
    `UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
    [status, id]
  );
  res.json(result.rows[0]);
};

exports.getCustomerOrders = async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT * FROM orders WHERE customer_id=$1 ORDER BY created_at DESC`,
    [id]
  );
  res.json(result.rows);
};

exports.updateOrderStatusByReference = async (reference, status) => {
  await pool.query(
    `UPDATE orders SET status=$1, updated_at=NOW() WHERE payment_reference=$2`,
    [status, reference]
  );
};

exports.logFailedTransaction = async (data) => {
  // Optionally log to a table or file
  console.error('Failed transaction:', data);
};
