## Purpose

Keeps the cost of free analyses bounded. Every analysis with a photo costs one paid vision call, so the number of calls per day is capped in Postgres, and a slot is claimed before each call. Bot protection on the analyze route joins this capability with that route.

## ADDED Requirements

### Requirement: Vision calls are capped per UTC day

A slot claim SHALL be granted while fewer than the cap have been granted on the current UTC day, and refused once the cap is reached. A new UTC day SHALL start from zero. Counting and granting SHALL happen in one atomic database statement, so concurrent claims never grant more than the cap.

**Unenforced:** concurrency itself is not exercised, because the in-process test database has one connection. The single-statement upsert, which locks the day's row, carries it; the scenarios below prove the counting.

#### Scenario: The last slot and the next claim

- **WHEN** the cap is 200 and 200 claims have been granted today
- **THEN** the 200th claim was granted and the 201st is refused

#### Scenario: A new day

- **WHEN** the cap was reached yesterday (UTC)
- **THEN** the first claim today is granted

### Requirement: The cap defaults to 200 a day

The cap SHALL be 200 unless `DAILY_ANALYSIS_CAP` holds a positive integer, which then replaces it. Any other value SHALL be ignored, and the cap SHALL stay 200.

#### Scenario: No override

- **WHEN** `DAILY_ANALYSIS_CAP` is unset
- **THEN** claims are made against a cap of 200

#### Scenario: A malformed override

- **WHEN** `DAILY_ANALYSIS_CAP` is `lots`
- **THEN** claims are made against a cap of 200

### Requirement: Only the server can claim a slot

The counter SHALL be readable and writable only through the claim, and the claim SHALL run only with the server's secret key. A browser holding the public key SHALL NOT be able to read the counter or claim a slot.

#### Scenario: The public role tries to claim

- **WHEN** the database's anonymous role calls the claim or reads the counter
- **THEN** it is refused with a permission error

### Requirement: An unreachable counter grants nothing

When the counter cannot be reached or answers with an error, the claim SHALL answer `unavailable` and grant no slot.

#### Scenario: The database is down

- **WHEN** the claim's database request fails
- **THEN** the claim answers `unavailable`
