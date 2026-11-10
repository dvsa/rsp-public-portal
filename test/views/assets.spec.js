const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const nunjucks = require('nunjucks');
const sass = require('sass');
const translations = require('../../src/server/i18n/en.json');

const root = path.resolve(__dirname, '../..');
const govukAssets = path.join(root, 'node_modules/govuk-frontend/dist/govuk/assets');
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader([
  path.join(root, 'src/server/views'),
  path.join(root, 'node_modules/govuk-frontend/dist'),
]), { autoescape: false });

env.addGlobal('govukRebrand', true);

describe('Portal asset URLs', () => {
  ['', 'https://assets.example.test/public'].forEach((assets) => {
    it(`links to the packaged rebranded manifest and icons with ${assets ? 'CDN' : 'local'} assets`, () => {
      const html = env.render('payment/index.njk', { t: translations, assets });
      const links = html.match(/<link\b[^>]*(?:rel="(?:icon|mask-icon|apple-touch-icon|manifest)")[^>]*>/g);

      expect(links).to.have.lengthOf(5);
      links.forEach((link) => {
        const href = link.match(/href="([^"]+)"/)[1];
        expect(href.startsWith(`${assets}/assets/rebrand/`)).to.equal(true);
        expect(fs.existsSync(path.join(govukAssets, href.slice(`${assets}/assets/`.length)))).to.equal(true);
      });
    });
  });

  it('resolves compiled font and image URLs beside the stylesheet in both local and CDN deployments', () => {
    const { css } = sass.compile(path.join(root, 'src/public/scss/index.scss'), {
      loadPaths: [path.join(root, 'node_modules')],
      logger: sass.Logger.silent,
    });
    const urls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((match) => match[1]);
    const assetUrls = urls.filter((url) => /\.(woff2?|svg)$/.test(url));

    expect(assetUrls.some((url) => url.endsWith('.woff2'))).to.equal(true);
    expect(assetUrls.some((url) => url.endsWith('govuk-crest.svg'))).to.equal(true);
    assetUrls.forEach((url) => {
      expect(url).to.match(/^assets\//);
      expect(fs.existsSync(path.join(govukAssets, url.slice('assets/'.length)))).to.equal(true);
      expect(new URL(url, 'https://assets.example.test/public/all.css?v=1').pathname).to.equal(`/public/${url}`);
      expect(new URL(url, 'http://localhost:3000/all.css').pathname).to.equal(`/${url}`);
    });
  });
});
