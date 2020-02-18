import config from '../config';

// Index Route
export const index = (req, res) => {
  const language = req.i18n_lang;
  if (config.isDevelopment()) {
    return res.render('cookies/details');
  }
  if (language === 'en') {
    return res.render('cookies/details');
  }
  return res.render('cookies/details');
};
