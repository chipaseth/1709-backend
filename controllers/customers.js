const pool = require('../models/db');
const secret = process.env.PG_CRYPTO_KEY || 'default-secret-key-for-development';

// Log the encryption key status (without revealing the actual key)
console.log('Encryption key status:', process.env.PG_CRYPTO_KEY ? 'Set' : 'Not set - using default');

exports.getAllCustomers = async (req, res) => {
  try {
    console.log('Getting all customers...');
    
    // Test database connection first
    try {
      await pool.query('SELECT 1');
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError.message);
      return res.status(500).json({ error: 'Database connection failed: ' + dbError.message });
    }
    
    // Check if customers table exists
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'customers'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.error('Customers table does not exist!');
        return res.status(500).json({ error: 'Customers table does not exist. Please run the database migrations.' });
      }
    } catch (tableError) {
      console.error('Error checking table existence:', tableError.message);
      return res.status(500).json({ error: 'Error checking table existence: ' + tableError.message });
    }
    
    // Get customers with decrypted phone and address - handle decryption errors gracefully
    let result;
    try {
      result = await pool.query(`
        SELECT 
          c.id,
          c.name,
          c.email,
          CASE 
            WHEN c.phone IS NOT NULL THEN pgp_sym_decrypt(c.phone, $1)
            ELSE NULL 
          END as phone,
          CASE 
            WHEN c.address IS NOT NULL THEN pgp_sym_decrypt(c.address, $1)
            ELSE NULL 
          END as address,
          c.created_at,
          COUNT(o.id) as total_orders
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        GROUP BY c.id, c.name, c.email, c.phone, c.address, c.created_at
        ORDER BY c.created_at DESC
      `, [secret]);
    } catch (decryptError) {
      console.log('Decryption failed, trying without decryption:', decryptError.message);
      // Fallback: get customers without decryption
      result = await pool.query(`
        SELECT 
          c.id,
          c.name,
          c.email,
          c.phone,
          c.address,
          c.created_at,
          COUNT(o.id) as total_orders
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        GROUP BY c.id, c.name, c.email, c.phone, c.address, c.created_at
        ORDER BY c.created_at DESC
      `);
    }
    
    console.log('Customers found:', result.rows.length);
    
    // Process the results to handle both encrypted and non-encrypted data
    const customers = result.rows.map(row => {
      let phone = null;
      let address = null;
      
      // Handle phone
      if (row.phone) {
        try {
          const phoneStr = row.phone.toString();
          // Check if it's encrypted (starts with \x)
          if (phoneStr.startsWith('\\x')) {
            // It's encrypted but we couldn't decrypt it
            phone = '[Encrypted Data]';
          } else {
            phone = phoneStr;
          }
        } catch (error) {
          console.log('Error processing phone for customer', row.id, ':', error.message);
          phone = null;
        }
      }
      
      // Handle address
      if (row.address) {
        try {
          const addressStr = row.address.toString();
          // Check if it's encrypted (starts with \x)
          if (addressStr.startsWith('\\x')) {
            // It's encrypted but we couldn't decrypt it
            address = '[Encrypted Data]';
          } else {
            // Try to parse as JSON first
            try {
              address = JSON.parse(addressStr);
            } catch (parseError) {
              // If not JSON, use as string
              address = addressStr;
            }
          }
        } catch (error) {
          console.log('Error processing address for customer', row.id, ':', error.message);
          address = null;
        }
      }
      
      return {
        ...row,
        phone,
        address
      };
    });
    
    res.json(customers);
  } catch (err) {
    console.error('Error in getAllCustomers:', err);
    console.error('Error details:', err.stack);
    res.status(500).json({ error: err.message });
  }
};

exports.getCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    let result;
    try {
      result = await pool.query(`
        SELECT 
          c.id,
          c.name,
          c.email,
          CASE 
            WHEN c.phone IS NOT NULL THEN pgp_sym_decrypt(c.phone, $1)
            ELSE NULL 
          END as phone,
          CASE 
            WHEN c.address IS NOT NULL THEN pgp_sym_decrypt(c.address, $1)
            ELSE NULL 
          END as address,
          c.created_at
        FROM customers c
        WHERE c.id = $2
      `, [secret, id]);
    } catch (decryptError) {
      console.log('Decryption failed, trying without decryption:', decryptError.message);
      // Fallback: get customer without decryption
      result = await pool.query(`
        SELECT 
          c.id,
          c.name,
          c.email,
          c.phone,
          c.address,
          c.created_at
        FROM customers c
        WHERE c.id = $1
      `, [id]);
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const customer = result.rows[0];
    
    // Process phone and address
    let phone = null;
    let address = null;
    
    if (customer.phone) {
      try {
        const phoneStr = customer.phone.toString();
        // Check if it's encrypted (starts with \x)
        if (phoneStr.startsWith('\\x')) {
          // It's encrypted but we couldn't decrypt it
          phone = '[Encrypted Data]';
        } else {
          phone = phoneStr;
        }
      } catch (error) {
        console.log('Error processing phone for customer', customer.id, ':', error.message);
        phone = null;
      }
    }
    
    if (customer.address) {
      try {
        const addressStr = customer.address.toString();
        // Check if it's encrypted (starts with \x)
        if (addressStr.startsWith('\\x')) {
          // It's encrypted but we couldn't decrypt it
          address = '[Encrypted Data]';
        } else {
          try {
            address = JSON.parse(addressStr);
          } catch (parseError) {
            address = addressStr;
          }
        }
      } catch (error) {
        console.log('Error processing address for customer', customer.id, ':', error.message);
        address = null;
      }
    }
    
    customer.phone = phone;
    customer.address = address;
    
    res.json(customer);
  } catch (err) {
    console.error('Error in getCustomerById:', err);
    res.status(500).json({ error: err.message });
  }
}; 