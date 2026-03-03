const { timingSafeEqualHex } = require("./timingSafeEqualHex");

function verifyCoinbaseSignature(rawBodyBuffer, signatureHex, secret) {
  if (!rawBodyBuffer || !Buffer.isBuffer(rawBodyBuffer)) return false;
  if (!signatureHex || !secret) return false;

  const computedHex = crypto
    .createHmac("sha256", secret)
    .update(rawBodyBuffer)
    .digest("hex");

  return timingSafeEqualHex(computedHex, signatureHex);
}

module.exports = { verifyCoinbaseSignature };
