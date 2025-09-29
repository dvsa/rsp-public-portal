const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const lambdaName = 'serveExpressApp';

module.exports = merge(common, {
  mode: 'development',
  devtool: 'source-map',
  watch: true, // automatically rebuilds on JS/SCSS changes
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: '.env', to: `[name]/` }, // copy environment file to Lambda folder
      ],
    }),
  ],
});
