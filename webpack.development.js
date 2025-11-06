const { merge } = require('webpack-merge');
const [serverConfig, clientConfig] = require('./webpack.common.js');

module.exports = [
  merge(serverConfig, {
    mode: 'development',
    devtool: 'source-map',
  }),
  merge(clientConfig, {
    mode: 'development',
    devtool: 'source-map',
  }),
];
