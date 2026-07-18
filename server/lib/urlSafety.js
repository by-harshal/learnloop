// Guards every outbound URL fetch the server makes on a user's behalf (blog, Google Doc,
// Google Sheet, YouTube). Without this, a user could point the server at an internal
// address (localhost, a private network, a cloud metadata endpoint) and use it as a proxy.
// This is a Security requirement, not an optional extra, since this app fetches
// user-supplied URLs server-side.

const dns = require('dns').promises;

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0']);

/**
 * Returns true if the given IPv4/IPv6 address is loopback, private, or link-local.
 */
function isPrivateOrReservedIp(ip) {
  if (ip === '::1') return true;
  if (ip.startsWith('::ffff:')) {
    return isPrivateOrReservedIp(ip.slice('::ffff:'.length));
  }

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    // Not a plain IPv4 address (likely IPv6). Block link-local (fe80::) and unique local (fc00::/fd00::).
    const lower = ip.toLowerCase();
    return lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd');
  }

  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local, includes cloud metadata (169.254.169.254)
  if (a === 0) return true;
  return false;
}

/**
 * Throws if the URL is not a safe, fetchable public http(s) address.
 * @param {string} urlString
 */
async function assertSafeUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('That does not look like a valid URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error('That URL points to a blocked host.');
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error('Could not resolve that URL. Check it is correct and publicly reachable.');
  }

  const unsafeAddress = addresses.find((entry) => isPrivateOrReservedIp(entry.address));
  if (unsafeAddress) {
    throw new Error('That URL resolves to a private or internal address, which is not allowed.');
  }

  return parsed;
}

module.exports = { assertSafeUrl, isPrivateOrReservedIp };
