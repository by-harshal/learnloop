jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

const dns = require('dns');
const { assertSafeUrl, isPrivateOrReservedIp } = require('../server/lib/urlSafety');

describe('isPrivateOrReservedIp', () => {
  test.each([
    ['127.0.0.1', true],
    ['10.0.0.5', true],
    ['172.16.0.1', true],
    ['172.31.255.255', true],
    ['192.168.1.1', true],
    ['169.254.169.254', true], // cloud metadata endpoint
    ['0.0.0.0', true],
    ['::1', true],
    ['8.8.8.8', false],
    ['172.32.0.1', false], // just outside the private range
    ['1.1.1.1', false],
  ])('%s -> %s', (ip, expected) => {
    expect(isPrivateOrReservedIp(ip)).toBe(expected);
  });
});

describe('assertSafeUrl', () => {
  beforeEach(() => {
    dns.promises.lookup.mockReset();
  });

  test('rejects a non-URL string', async () => {
    await expect(assertSafeUrl('not a url')).rejects.toThrow('valid URL');
  });

  test('rejects a non-http(s) protocol', async () => {
    await expect(assertSafeUrl('ftp://example.com/file')).rejects.toThrow('http and https');
  });

  test('rejects localhost before any DNS lookup', async () => {
    await expect(assertSafeUrl('http://localhost:3000/admin')).rejects.toThrow('blocked host');
    expect(dns.promises.lookup).not.toHaveBeenCalled();
  });

  test('rejects a host that resolves to a private IP', async () => {
    dns.promises.lookup.mockResolvedValue([{ address: '192.168.1.1', family: 4 }]);
    await expect(assertSafeUrl('http://internal.example.com/')).rejects.toThrow('private or internal');
  });

  test('rejects a host that resolves to the cloud metadata address', async () => {
    dns.promises.lookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
    await expect(assertSafeUrl('http://sneaky.example.com/')).rejects.toThrow('private or internal');
  });

  test('rejects a host that fails to resolve', async () => {
    dns.promises.lookup.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(assertSafeUrl('http://does-not-exist.example.com/')).rejects.toThrow('Could not resolve');
  });

  test('accepts a host that resolves to a public IP', async () => {
    dns.promises.lookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    const parsed = await assertSafeUrl('https://example.com/article');
    expect(parsed.hostname).toBe('example.com');
  });
});
