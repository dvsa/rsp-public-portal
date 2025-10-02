const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const archiver = require('archiver');
const fs = require('fs-extra');
const { execSync } = require('child_process');

const LAMBDA_NAME = 'serveExpressApp';
const OUTPUT_FOLDER = './dist';
const REPO_NAME = 'rsp-public';
let BRANCH_NAME;
try {
  BRANCH_NAME = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim().replace(/\//g, '-');
} catch (error) {
  BRANCH_NAME = 'main';
}
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
          inputPath: OUTPUT_FOLDER,
          outputPath: OUTPUT_FOLDER,
          outputName: `${REPO_NAME}-${BRANCH_NAME}-lambda`,
          ignore: ['public'], // public assets are copied separately
        },
      ],
      assets: [
        {
          inputPath: `${OUTPUT_FOLDER}/public`,
          outputPath: `${OUTPUT_FOLDER}/${REPO_NAME}-cloudfront-assets-${BRANCH_NAME}`,
        },
      ],
    }),
  ],
});
