const secret = process.env.PG_CRYPTO_KEY;
exports.encrypt = (text) => `pgp_sym_encrypt('${text}', '${secret}')`;
exports.decrypt = (field) => `pgp_sym_decrypt(${field}, '${secret}')`;
