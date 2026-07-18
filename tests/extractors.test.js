const { csvToReadableText } = require('../server/lib/extractors/googleSheet');

describe('csvToReadableText', () => {
  test('turns header + rows into labelled lines', () => {
    const csv = 'Name,Capital\nFrance,Paris\nJapan,Tokyo';
    const result = csvToReadableText(csv);
    expect(result).toBe('Name: France, Capital: Paris\nName: Japan, Capital: Tokyo');
  });

  test('returns an empty string for an empty CSV', () => {
    expect(csvToReadableText('')).toBe('');
  });

  test('ignores blank lines', () => {
    const csv = 'Name,Age\n\nBob,30\n\n';
    const result = csvToReadableText(csv);
    expect(result).toBe('Name: Bob, Age: 30');
  });
});
