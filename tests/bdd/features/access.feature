Feature: Role-based access
  As FWIS leadership
  I need each role to see only permitted areas

  Scenario: Super admin has all permissions
    Given role "SUPER_ADMIN"
    When I check permission "schools:delete"
    Then access should be granted

  Scenario: Teacher cannot delete schools
    Given role "TEACHER"
    When I check permission "schools:delete"
    Then access should be denied

  Scenario: School admin can manage enrollments
    Given role "SCHOOL_ADMIN"
    When I check permission "enrollments:create"
    Then access should be granted

  Scenario: Teacher is scoped to assigned classrooms
    Given a teacher assigned to grade one boys
    When I build enrollment scope for the teacher
    Then only that classroom id is allowed

  Scenario: Super admin navigation includes schools and users
    Given role "SUPER_ADMIN"
    When I load navigation items
    Then nav should include "/schools" and "/users"

  Scenario: Teacher navigation includes attendance and assessments
    Given role "TEACHER"
    When I load navigation items
    Then nav should include "/teacher/attendance" and "/teacher/assessments"

  Scenario: Landing path for school admin
    Given role "SCHOOL_ADMIN"
    When I resolve the landing path
    Then the path should be "/dashboard/school-admin"
