Feature: Cookie Management
  User can access the Cookie Preferences page and set their desired preferences

  Background:
    Given The entry point is the 'Home' page
    And The user navigates to the 'cookiePreferences' page

  Scenario: Turn on Cookie preferences
    Given I am on the 'Cookie preferences' page
    When I turn Cookies 'on'
    Then I should see the on radio button checked
    And I see the success banner notification
    But I will not see the cookie banner

  Scenario: Turn off Cookie Preferences
    Given I am on the 'Cookie preferences' page
    When I turn Cookies 'off'
    Then I should see the off radio button checked
    And I see the success banner notification
    But I will not see the cookie banner

  Scenario: Go back to the previous page
    Given I am on the 'Cookie preferences' page
    And I see the success banner notification
    When I click the link to go back to the previous page
    Then I should see 'Enter payment code' in the title

  Scenario: Access the Cookie details page
    Given I am on the 'Cookie preferences' page
    When I click the Cookie Details link
    Then I should see 'Details about cookies' in the title

  Scenario: Access the Cookie preferences page from Cookie details page
    Given I am on the 'Cookie preferences' page
    When I click the Cookie Details link
    And I click the Cookie preferences link
    Then I should see 'Cookies on Roadside Payments service' in the title
