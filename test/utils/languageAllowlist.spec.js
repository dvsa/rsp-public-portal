import { describe, it } from 'mocha';
import { expect } from 'chai';
import { allowList } from '../../src/server/utils/language-allowlist';

describe('language allowlist', () => {
  it('contains unique two-letter language codes and supports English and Welsh', () => {
    expect(new Set(allowList).size).to.equal(allowList.length);
    expect(allowList.every((language) => /^[a-z]{2}$/.test(language))).to.equal(true);
    expect(allowList).to.include.members(['en', 'cy']);
  });
});
