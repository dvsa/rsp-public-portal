import config from '../config';

// Index Route
export const index = (req, res) => {
  const language = req.i18n_lang;
  if (config.isDevelopment()) {
    return res.render('cookies/index');
  }
  if (language === 'en') {
    return res.redirect(`${config.urlRoot()}/cookie-preferences`);
  }
  return res.render('cookies/index');
};
