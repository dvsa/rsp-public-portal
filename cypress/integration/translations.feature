Feature: Language Translations
  User can choose their preferred language

  Background:
    Given The entry point is the 'Home' page
    And The user navigates to the 'paymentCode' page

  Scenario Outline: Choose language
    Given I am on the '<page name>' page
    When I want to display the page in '<language>'
    Then I should see the page change to the '<language>' language
    And a cookie will be set with the '<language code>' language code

    Examples:
    | page name    | language         | language code |
    | Payment code | French           | fr            |
    | Payment code | German           | de            |
    | Payment code | Polish           | pl            |
    | Payment code | Welsh            | cy            |
    | Payment code | Bulgarian        | bg            |
    | Payment code | Croatian         | hr            |
    | Payment code | Czech            | cz            |
    | Payment code | Dutch            | nl            |
    | Payment code | Estonian         | ee            |
    | Payment code | Greek            | gr            |
    | Payment code | Hungarian        | hu            |
    | Payment code | Italian          | it            |
    | Payment code | Latvian          | lv            |
    | Payment code | Lithuanian       | lt            |
    | Payment code | Portugeuse       | pt            |
    | Payment code | Romanian         | ro            |
    | Payment code | Russian          | ru            |
    | Payment code | Serbian-Cyrillic | rs            |
    | Payment code | Slovak           | sk            |
    | Payment code | Slovenian        | sl            |
    | Payment code | Turkish          | tr            |

  Scenario: Choose invalid language
    Given I am on the 'Payment code' page
    When I want to display the 'paymentCode' page in 'Valyrian'
    Then I should see the 'paymentCode' page remain in the 'English' language
    And a locale cookie will not be set

  Scenario: Inject malicious code
    Given I am on the 'Payment code' page
    When The malicious content is injected to the 'paymentCode' page
    Then I should see no change to the 'paymentCode' page
    And a locale cookie will not be set