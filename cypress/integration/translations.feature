Feature: Language Translations
  User can choose their preffered language

  Background:
    Given The entry point is the 'Home' page
    And The user navigates to the 'paymentCode' page

  Scenario: Choose French language
    Given I am on the 'Payment code' page
    When I want to display the page in 'French'
    Then I should see the page change to the 'French' language
    And a cookie will be set with the 'fr' language code

  Scenario: Choose German language
    Given I am on the 'Payment code' page
    When I want to display the page in 'German'
    Then I should see the page change to the 'German' language
    And a cookie will be set with the 'de' language code

  Scenario: Choose Polish language
    Given I am on the 'Payment code' page
    When I want to display the page in 'Polish'
    Then I should see the page change to the 'Polish' language
    And a cookie will be set with the 'pl' language code

  Scenario: Choose Welsh language
    Given I am on the 'Payment code' page
    When I want to display the page in 'Welsh'
    Then I should see the page change to the 'Welsh' language
    And a cookie will be set with the 'cy' language code

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