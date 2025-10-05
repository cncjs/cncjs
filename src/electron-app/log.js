import debug from 'debug';
import pkg from '../package.json';

const log = {
  debug: debug(pkg + ':debug'),
  info: debug(pkg + ':info'),
  warn: debug(pkg + ':warn'),
  error: debug(pkg + ':error'),
  fatal: debug(pkg + ':fatal')
};

export default log;
