import { expect } from 'chai';
import modifyPath from '../../src/server/utils/modifyPath';

const eventPath = 'path/to/the/resource';

describe('modifyPath', () => {
  const result = modifyPath(eventPath);
  expect(result).to.equal('/the/resource');
});
