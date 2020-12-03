import { describe } from 'mocha';
import sinon from 'sinon';
import { index } from '../../src/server/controllers/cookieDetails.controller';

describe('cookieDetails', () => {
  const req = {};
  let res;
  let renderSpy

  before(() => {
    renderSpy = sinon.spy();
    res = { render: renderSpy };
  });

  after(() => {
    renderSpy.resetHistory();
  });

  it('should render the cookie details page', () => {
    index(req, res);
    sinon.assert.calledWith(renderSpy, 'cookies/details');
  });
});
