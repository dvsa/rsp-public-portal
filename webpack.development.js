const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const lambdaName = 'serveExpressApp';

module.exports = merge(common, {
  mode: 'development',
  devtool: 'source-map',
  watch: false,
  plugins: [
  ],
});
