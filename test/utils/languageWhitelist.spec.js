import { expect } from 'chai';
import { whitelist } from '../../src/server/utils/language-whitelist';

const languageCodeList = ['en', 'fr', 'de', 'cy', 'es', 'pl'];

describe('whitelist', () => {
  it('should match the whitelisted language codes', () => {
    expect(whitelist).to.eql(languageCodeList);
  });
});
