const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const archiver = require('archiver');
const fs = require('fs-extra');
const branchName = require('current-git-branch');

const LAMBDA_NAME = 'serveExpressApp';
const OUTPUT_FOLDER = './dist';
const REPO_NAME = 'rsp-public';
const BRANCH_NAME = branchName().replace(/\//g, '-');

class BundlePlugin {
  constructor({ archives = [], assets = [] }) {
    this.archives = archives;
    this.assets = assets;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tap('zip-pack-plugin', async () => {
      this.archives.forEach(async (archive) => {
        await this.createArchive(archive.inputPath, archive.outputPath, archive.outputName, archive.ignore);
      });

      this.assets.forEach((asset) => {
        fs.copySync(asset.inputPath, asset.outputPath);
      });
    });
  }

  createArchive(inputPath, outputPath, outputName, ignore = []) {
    if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath, { recursive: true });

    const output = fs.createWriteStream(`${outputPath}/${outputName}.zip`);
    const archive = archiver('zip');

    archive.pipe(output);
    archive.glob('**/*', { cwd: inputPath, ignore });
    return archive.finalize();
  }
}

module.exports = merge(common, {
  mode: 'production',
  optimization: {
    minimizer: [new CssMinimizerPlugin(), new TerserPlugin()],
  },
  plugins: [
    new BundlePlugin({
      archives: [
        {
          inputPath: `.webpack/${LAMBDA_NAME}`,
          outputPath: OUTPUT_FOLDER,
          outputName: `${REPO_NAME}-${BRANCH_NAME}-lambda`,
          ignore: ['public'], // public assets are copied separately
        },
      ],
      assets: [
        {
          inputPath: `.webpack/${LAMBDA_NAME}/public`,
          outputPath: `${OUTPUT_FOLDER}/${REPO_NAME}-cloudfront-assets-${BRANCH_NAME}`,
        },
      ],
    }),
  ],
});
