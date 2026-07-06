Feature: Students and enrollments
  As a school administrator
  I manage global students and per-year enrollments

  Scenario: Enrollment requires student school year and classroom
    Given an enrollment missing classroom id
    When I validate the enrollment schema
    Then validation should fail

  Scenario: Super admin enrollment list filters by school
    Given enrollments for Houston and Chicago
    When the super admin filters by Houston school id
    Then only Houston enrollments are included

  Scenario: Super admin enrollment list filters by classroom
    Given enrollments in two classrooms
    When filtering by grade one boys classroom
    Then only that classroom enrollment is included

  Scenario: Enrollment list respects academic year school link
    Given an enrollment for year school link "Houston 2025-2026"
    When filtering by that academic year school id
    Then the Houston enrollment is included

  Scenario: Student number uses city and gender prefix
    Given city code "HOU" and gender "MALE"
    When I derive the city code from Houston
    Then city code should be "HOU"
