import { describe, it } from 'mocha';
import sinon from 'sinon';
import * as accessibilityStatementController from '../../src/server/controllers/accessibilityStatement.controller';
import * as privacyController from '../../src/server/controllers/privacy.controller';

describe('static statement controllers', () => {
  it('renders the accessibility statement', () => {
    const render = sinon.spy();
    accessibilityStatementController.index({}, { render });

    sinon.assert.calledWith(render, 'accessibility-statement');
  });

  it('renders the privacy statement', () => {
    const render = sinon.spy();
    privacyController.index({}, { render });

    sinon.assert.calledWith(render, 'privacy-statement');
  });
});
