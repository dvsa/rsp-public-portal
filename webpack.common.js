const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const sass = require('sass');

const lambdaSrc = path.resolve(__dirname, 'src', 'lambdas', 'serveExpressApp.js');
const serverViews = path.resolve(__dirname, 'src', 'server', 'views');
const publicJsDir = path.resolve(__dirname, 'src', 'public', 'js');

// Server configuration (Lambda)
const serverConfig = {
  name: 'server',
  entry: {
    lambda: lambdaSrc,
  },
  output: {
    filename: 'handler.js',
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, 'dist'),
  },
  target: 'node16',
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: [{ fsevents: "require('fsevents')" }, 'aws-sdk'],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { node: '16.16' }, useBuiltIns: 'entry', corejs: '3' }],
            ],
            plugins: [
              ['@babel/plugin-proposal-class-properties', { loose: false }],
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: serverViews, to: 'views' },
        { from: 'src/server/i18n', to: 'i18n' },
        { from: 'node_modules/govuk-frontend/dist/govuk/assets', to: 'public/assets' },
        { from: 'node_modules/govuk-frontend/dist/govuk/template.njk', to: 'views/template.njk' },
        { from: 'node_modules/govuk-frontend/dist/govuk', to: 'views/govuk' },
        { from: 'node_modules/govuk-frontend/dist/govuk/all.bundle.js', to: 'public/all.bundle.js' },
        { from: 'node_modules/govuk-frontend/dist/govuk/all.bundle.js.map', to: 'public/all.bundle.js.map' },
        { from: 'node_modules/@dvsa/cookie-manager/cookie-manager.js', to: 'public/cookie-manager.js' },
        {
          from: 'src/public/scss/index.scss',
          to: 'public/all.css',
          transform: (content) => {
            const result = sass.compileString(content.toString(), {
              loadPaths: ['src/public/scss/', 'node_modules'],
              style: 'compressed',
            });
            return result.css.toString();
          },
        },
      ],
    }),
  ],
};

// Client configuration (Browser)
const clientConfig = {
  name: 'client',
  entry: {
    client: {
      import: [
        path.resolve(publicJsDir, 'dvsa', 'index.js'),
        path.resolve(publicJsDir, 'cookie-manager.js'),
        path.resolve(publicJsDir, 'go-back.js'),
        path.resolve(publicJsDir, 'google-tag-manager.js'),
      ],
    },
  },
  output: {
    filename: 'public/[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'umd',
    },
    environment: {
      arrowFunction: false,
    },
  },
  target: 'web',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { 
                targets: {
                  browsers: ['> 1%', 'last 2 versions', 'ie >= 11']
                }, 
                useBuiltIns: 'entry', 
                corejs: '3' 
              }],
            ],
            plugins: [
              ['@babel/plugin-proposal-class-properties', { loose: false }],
            ],
          },
        },
      },
    ],
  },
};

module.exports = [serverConfig, clientConfig];