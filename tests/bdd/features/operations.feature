Feature: Core operations
  As the FWIS platform
  I need grading, student IDs, school filters, and route guards to behave consistently

  Scenario: Classroom list filters by selected school
    Given classrooms from Houston and Chicago
    When I filter for Houston
    Then only Houston classrooms remain

  Scenario: Valid academic year create payload passes
    Given a year with one school and ordered dates
    When I validate the create schema
    Then validation should succeed

  Scenario: Student numbers follow city-gender-sequence format
    Given Houston city code and male gender
    When I format student number 42
    Then the number should be "HOU-B42"

  Scenario: School admin can access assigned school only
    Given a school admin for Houston
    When I check access to Houston and Chicago
    Then Houston is allowed and Chicago is denied

  Scenario: Teachers may only reach teacher routes
    Given teacher paths for attendance and schools admin
    When I check route access
    Then attendance is allowed and schools admin is denied

  Scenario: Perfect attendance and scores yield passing grade
    Given full instructional calendar and perfect scores
    When I compute enrollment grade metrics
    Then the student passes with letter grade A
