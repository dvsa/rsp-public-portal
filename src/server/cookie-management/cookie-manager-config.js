/* eslint-disable */
export const cookieManagerConfig = {
  'delete-undefined-cookies': true,
  'user-preference-cookie-name': 'cm-user-preferences',
  'user-preference-cookie-secure': false,
  'user-preference-cookie-expiry-days': 365,
  'user-preference-configuration-form-id': 'cookie-preferences-form',
  'user-preference-saved-callback': () => {
    const cookiePreferencesConfirmation = document.getElementById('cookie-preferences-confirmation');
    cookiePreferencesConfirmation.classList.remove('hidden');
    window.scrollTo(0, 0);
  },
  'cookie-banner-id': 'global-cookie-banner',
  'cookie-banner-visibility-class': 'hidden',
  'cookie-banner-visible-on-page-with-preference-form': false,
  'set-checkboxes-in-preference-form': true,
  'domains': [
    'localhost',
    'pay-roadside-fine.service.gov.uk',
  ],
  'cookie-manifest': [
    {
      'category-name': 'essential',
      'optional': false,
      'cookies': [
        'cm-user-preferences',
        'locale',
      ],
    },
    {
      'category-name': 'analytics',
      'optional': true,
      'cookies': [
        '_gat_UA-124455500-1',
        '_ga',
        '_gid',
      ],
    },
  ],
};
