Feature: Accessibility Statement
  User can access the accessibility statement

  Scenario: Page is available
    Given The entry point is the 'Home' page
    And The user navigates to the 'accessibilityStatement' page
    Then I should see 'Accessibility statement for Roadside Payments' in the title
