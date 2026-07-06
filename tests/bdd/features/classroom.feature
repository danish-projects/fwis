Feature: Classroom Sunday operations
  As a teacher or school admin
  I record attendance, behavior, assessments, and lesson plans

  Scenario: Present and tardy count toward attendance percentage
    Given 8 countable Sundays and 7 present or tardy marks
    When I calculate attendance percentage
    Then the result should be 87.5

  Scenario: Zero countable days defaults attendance to perfect
    Given 0 countable Sundays
    When I calculate attendance percentage
    Then the result should be 100

  Scenario: Outstanding behavior increases score
    Given base behavior with rating "OUTSTANDING"
    When I calculate behavior score
    Then the score should be above the base of 85

  Scenario: Instructional day with drive folder allows lesson plan lookup
    Given an instructional calendar day and a docs drive folder id
    When I evaluate lesson plan availability
    Then the day should be instructional and drive should be configured

  Scenario: Quiz days are not instructional lesson plan days
    Given a quiz session calendar day
    When I check if the day is instructional for lesson plans
    Then the day should not be instructional

  Scenario: Perfect assessment scores yield high final percentage
    Given perfect attendance behavior and assessment scores
    When I calculate the final percentage
    Then the final percentage should be at least 99

  Scenario: Letter grade A for excellent performance
    Given a final percentage of 95
    When I map to letter grade
    Then the letter grade should be "A"
