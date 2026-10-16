## MODIFIED Requirements

### Requirement: A report gets at most 3 emails

A report SHALL take at most 3 stored addresses, counted whatever they are, and each stored address SHALL get one email. A fourth request SHALL be answered 429, and SHALL store and send nothing. The count and the store SHALL be one database step, so two requests at once cannot both pass the limit. The email step SHALL then open the report without sending, since the report itself is the person's.

**Unenforced:** the race itself is not exercised, because the in-process test database has one connection. The row lock the database step takes on the report carries it; the scenarios below prove the counting, and a test pins that the lock is in the SQL.

#### Scenario: The fourth address

- **WHEN** a fourth address is sent for a report that already has 3
- **THEN** the route answers 429, no address is stored, no email is sent, and the step opens the report

#### Scenario: Two requests at once

- **WHEN** two addresses are sent at the same moment for a report that has 2
- **THEN** exactly one is stored and emailed, and the other is answered 429
