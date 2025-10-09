/* eslint-disable global-require */
import '@babel/polyfill';
import express from 'express';
import { check } from 'express-validator';
import bodyParser from 'body-parser';
import compression from 'compression';
import awsServerlessExpressMiddleware from 'aws-serverless-express/middleware';
import nunjucks from 'nunjucks';
import path from 'path';
import _ from 'lodash';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import nocache from 'nocache';
import i18n from 'i18n-express';
import config from './config';
import { allowList } from './utils/language-allowlist';

const SIXTY_DAYS_IN_SECONDS = 5184000;

export default async () => {
  await config.bootstrap();

  // Create nunjucks fileloader instance for the views folder -- edited to use govuk templates
  const nunjucksFileLoader = new nunjucks.FileSystemLoader([
    config.views(),
    path.join(__dirname, '..', '..', 'node_modules', 'govuk-frontend', 'dist'),
  ], {
    noCache: true,
  });

  const env = new nunjucks.Environment(nunjucksFileLoader, {
    autoescape: false,
    web: {
      useCache: false,
    },
  });

  env.addGlobal('assets', '');
  env.addGlobal('urlroot', config.urlRoot());
  env.addGlobal('govukRebrand', true);

  // Add lodash as a global for view templates
  env.addGlobal('_', _);

  const app = express();

  app.use(helmet());

  app.use(helmet.noSniff());

  app.use(helmet.xssFilter({ setOnOldIE: true }));
  app.use(helmet.crossOriginEmbedderPolicy({ policy: 'credentialless' }));

  const assetsUrl = config.isDevelopment() ? 'http://localhost:3000/' : `${config.assets()}/`;
  app.use('/', express.static(path.join(__dirname, '..', '..', 'dist', 'public')));
  app.set('views', path.join(__dirname, '..', '..', 'dist', 'views'));

  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", assetsUrl],
      formAction: ['*'],
      scriptSrc: [assetsUrl, 'https://www.googletagmanager.com/', 'https://www.google-analytics.com/'],
      fontSrc: ["'self'", 'data:', assetsUrl],
      imgSrc: [
        assetsUrl,
        'https://www.google-analytics.com/',
        'https://stats.g.doubleclick.net/',
        'https://www.google.co.uk/ads/',
        'https://www.google.com/ads/',
      ],
    },
  }));

  app.use(helmet.hsts({
    maxAge: SIXTY_DAYS_IN_SECONDS,
  }));

  app.use(nocache());

  // Add express to the nunjucks enviroment instance
  env.express(app);
  app.use(cookieParser());

  // Create a view engine from nunjucks enviroment variable
  app.engine('njk', env.render);

  // Set the express view engine to the above created view engine
  app.set('view engine', 'njk');
  app.set('view cache', false);

  // Disable powered by express in header
  app.set('x-powered-by', false);

  app.use(compression());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(express.json());

  app.use(i18n({
    translationsPath: path.join(__dirname, 'i18n'),
    siteLangs: [
      'en',
      'fr',
      'de',
      'cy',
      'es',
      'pl',
      'bg',
      'hr',
      'cs',
      'nl',
      'et',
      'el',
      'hu',
      'it',
      'lv',
      'lt',
      'pt',
      'ro',
      'ru',
      'sr',
      'sk',
      'sl',
      'tr',
      'ua',
    ],
    textsVarName: 't',
    cookieLangName: 'locale',
  }));

  // Make the selected language available globally
  app.use((req, res, next) => {
    let language;
    const isLangPresent = typeof req.query.clang !== 'undefined';
    const isLanguageSet = typeof req.cookies.locale !== 'undefined';
    const isLangValid = isLangPresent && allowList.includes(req.query.clang);

    const setLanguage = () => {
      res.cookie('locale', req.query.clang);
      language = req.query.clang;
    };

    const useCurrentLanguage = () => {
      req.query.clang = req.cookies.locale;
      language = req.cookies.locale;
    };

    if (isLangValid) {
      setLanguage();
    }

    if (isLanguageSet) {
      useCurrentLanguage();
    }

    env.addGlobal('clang', language);
    next();
  });

  // Always sanitizes the body
  app.use((req, res, next) => {
    Object.keys(req.body).forEach((item) => {
      check(item).escape();
    });
    next();
  });

  app.use(awsServerlessExpressMiddleware.eventContext());
  // Load routes module dynamically to allow config to initialise
  app.use('/', require('./routes').default);

  return app;
};
