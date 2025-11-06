const { merge } = require('webpack-merge');
const [serverConfig, clientConfig] = require('./webpack.common.js');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const archiver = require('archiver');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const webpack = require('webpack');
const packageJson = require('./package.json');
const path = require('path');

const LAMBDA_NAME = 'serveExpressApp';
const OUTPUT_FOLDER = './dist';
const REPO_NAME = 'rsp-public';
let BRANCH_NAME;
try {
  BRANCH_NAME = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim().replace(/\//g, '-');
} catch (error) {
  BRANCH_NAME = 'main';
}
class PackagePlugin {
  constructor({ outputPath, outputName }) {
    this.outputPath = outputPath;
    this.outputName = outputName;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tap('package-plugin', async () => {
      if (!fs.existsSync(this.outputPath)) fs.mkdirSync(this.outputPath, { recursive: true });

      const output = fs.createWriteStream(`${this.outputPath}/${this.outputName}.zip`);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      archive.pipe(output);

      archive.append(fs.readFileSync(path.join(this.outputPath, 'handler.js')), { name: 'app.js' });
      archive.directory(path.join(this.outputPath, 'public'), 'public');
      archive.directory(path.join(this.outputPath, 'views'), 'views');
      archive.directory(path.join(this.outputPath, 'i18n'), 'i18n');
      archive.finalize();
    });
  }
}
module.exports = [
  // Server config with packaging plugins
  merge(serverConfig, {
    mode: 'production',
    devtool: false,
    optimization: {
      minimizer: [new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      })],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.APP_VERSION': JSON.stringify(packageJson.version),
      }),
      new PackagePlugin({
        outputPath: OUTPUT_FOLDER,
        outputName: 'package',
      }),
    ],
  }),
  // Client config
  merge(clientConfig, {
    mode: 'production',
    devtool: false,
    optimization: {
      minimizer: [new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      })],
    },
  }),
];
