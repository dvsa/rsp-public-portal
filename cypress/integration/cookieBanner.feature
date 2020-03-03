Feature: Cookie Banner
  User is presented with options to set their Cookie preferences

  Background:
    Given The entry point is the 'Home' page

  Scenario: Coookie banner - accept all
    Given I am on the 'Payment code' page
    And I have not set my Cookie preferences before
    When I choose to accept all cookies
    Then All cookies should be set to on
    And I will not see the cookie banner

  Scenario: Cookie banner - set cookie preferences
    Given I am on the 'Payment code' page
    And I have not set my Cookie preferences before
    When I choose to set my Cookie preferences
    Then I should be taken to the Cookie preferences page
    And I should see 'Cookies on Roadside Payments service' in the title
