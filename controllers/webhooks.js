const crypto = require('crypto');
const { updateOrderStatusByReference, logFailedTransaction } = require('./orders');

exports.handlePaystackWebhook = async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) return res.status(401).send('Invalid signature');
  const event = req.body.event;
  if (event === 'charge.success') {
    const reference = req.body.data.reference;
    await updateOrderStatusByReference(reference, 'paid');
    return res.sendStatus(200);
  } else {
    await logFailedTransaction(req.body);
    return res.sendStatus(200);
  }
};
