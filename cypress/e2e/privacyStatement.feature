Feature: Privacy Statement
  User can access the privacy statement

  Scenario: Page is available
    Given The entry point is the 'Home' page
    And The user navigates to the 'privacyStatement' page
    Then I should see 'Pay a DVSA roadside fine: privacy notice' in the title
