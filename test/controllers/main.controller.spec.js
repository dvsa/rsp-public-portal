import { describe } from 'mocha';
import sinon from 'sinon';
import config from '../../src/server/config';
import { robots, index } from '../../src/server/controllers/main.controller';

describe('main', () => {
  let configStub;
  let req;
  let res;
  let renderSpy;
  let redirectSpy;
  let typeSpy;
  let sendSpy;

  before(() => {
    configStub = sinon.stub(config, 'isDevelopment');
    renderSpy = sinon.spy();
    redirectSpy = sinon.spy();
    typeSpy = sinon.spy();
    sendSpy = sinon.spy();
    res = {
      render: renderSpy,
      redirect: redirectSpy,
      type: typeSpy,
      send: sendSpy
    };
  });

  after(() => {
    renderSpy.resetHistory();
    redirectSpy.resetHistory();
    typeSpy.resetHistory();
    sendSpy.resetHistory();
  });

  context('robots', () => {
    it('should set response type', () => {
      robots(req, res);
      sinon.assert.calledWith(typeSpy, 'text/plain');
    });

    it('should set response send', () => {
      robots(req, res);
      sinon.assert.calledWith(sendSpy, 'User-agent: *\nDisallow: /');
    });
  });

  context('index', () => {
    it('should redirect to the payment code page in development', () => {
      configStub.returns(true);
      req = { i18n_lang: 'en' };
      index(req, res);
      sinon.assert.calledWith(redirectSpy, '/payment-code');
    });

    it('should redirect to the English homepage in prod when English', () => {
      configStub.returns(false);
      req = { i18n_lang: 'en' };
      index(req, res);
      sinon.assert.calledWith(redirectSpy, 'https://www.gov.uk/pay-dvsa-roadside-fine');
    });

    it('should redirect to the Welsh homepage in prod when Welsh', () => {
      configStub.returns(false);
      req = { i18n_lang: 'cy' };
      index(req, res);
      sinon.assert.calledWith(redirectSpy, 'https://www.gov.uk/talu-dirwy-ymylffordd-dvsa');
    });

    it('should render the index page if no language is set', () => {
      configStub.returns(false);
      req = { i18n_lang: '' };
      index(req, res);
      sinon.assert.calledWith(renderSpy, 'main/index');
    });
  });
});
