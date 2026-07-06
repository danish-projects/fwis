Feature: School setup
  As a school administrator
  I need to configure campuses, years, calendar, grades, and teachers

  Scenario: School codes use FWIS city prefix
    Given city code "HOU"
    When I format the school code
    Then the code should be "FWIS-HOU"

  Scenario: Academic year create requires at least one school
    Given an academic year payload with no schools selected
    When I validate the create schema
    Then validation should fail

  Scenario: Academic year dates must be ordered
    Given an academic year with end date before start date
    When I validate the year schema
    Then validation should fail

  Scenario: Calendar marks instructional Sundays
    Given a Sunday in session type "INSTRUCTIONAL"
    When I check if attendance is needed
    Then attendance should be required

  Scenario: Holidays do not require attendance
    Given a Sunday in session type "HOLIDAY"
    When I check if attendance is needed
    Then attendance should not be required

  Scenario: Male teachers map to Boys section
    Given teacher gender "MALE"
    When I resolve the section name
    Then the section should be "Boys"

  Scenario: Classroom list is scoped to selected school
    Given a super admin and school "Houston"
    When I build the classroom list filter for that school
    Then only Houston classrooms match
