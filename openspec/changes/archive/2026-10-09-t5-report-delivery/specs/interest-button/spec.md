## Purpose

Measures willingness to pay before payments exist: the report's "Premium report – coming soon" button records one interest per report, and only those people get one email when a premium report launches.

## ADDED Requirements

### Requirement: The Premium card follows the canvas

The report SHALL show the Premium card of canvas artboard "10 Premium button": the overline "Next", the heading "A deeper report", "A capsule wardrobe built from your palette, outfit formulas and a palette card for shopping." and the button "Premium report – coming soon".

#### Scenario: A report nobody has asked about

- **WHEN** a report with no recorded interest is opened
- **THEN** the card shows "Premium report – coming soon" as an enabled button

### Requirement: A tap records one interest per report

Tapping "Premium report – coming soon" SHALL record interest for the report, with the time of the first tap, as test data when recorded outside the production deployment. A report SHALL have at most one interest record: later taps, and taps from another visit, SHALL record nothing more and SHALL still succeed.

#### Scenario: The first tap

- **WHEN** a person taps "Premium report – coming soon" on a report
- **THEN** one interest record exists for that report

#### Scenario: A second tap from another device

- **WHEN** interest is recorded again for the same report
- **THEN** the route succeeds and there is still one record

### Requirement: The clicked state names where the news will go

Once interest is recorded, the card SHALL show a disabled "We'll let you know" with a check icon, and the note "Thanks for asking" with "Premium reports aren't out yet. We'll email <address> once, when they are. Nothing to pay now.", where the address is the one most recently given for the report. With no address stored, the note SHALL say "We'll email you once" instead. A report opened again after the tap SHALL show the clicked state.

#### Scenario: After the tap

- **WHEN** interest is recorded for a report whose address is `maya.reyes@gmail.com`
- **THEN** the card shows "We'll let you know", disabled, and "We'll email maya.reyes@gmail.com once, when they are."

#### Scenario: Opened again

- **WHEN** a report with recorded interest is opened
- **THEN** the card shows the clicked state without a tap

### Requirement: A failed tap can be repeated

When recording fails (a network error, a server error or no answer within 10 s), the button SHALL return to "Premium report – coming soon" and the card SHALL say "We couldn't save that. Please try again." The route SHALL give up on the database after 3 s and report the failure to Sentry.

#### Scenario: The database is down

- **WHEN** the interest route cannot store the record
- **THEN** it answers 500, Sentry receives the error, and the button can be tapped again

### Requirement: Only real reports take interest

The interest route SHALL answer 404 for an id that is malformed or has no report, and SHALL store nothing. A malformed id SHALL be refused before any database request.

#### Scenario: An unknown id

- **WHEN** interest is sent for a well-formed id with no report
- **THEN** the route answers 404 and nothing is stored

### Requirement: Only the server can read or write interest

Interest records SHALL be readable and writable only with the server's secret key. A browser holding the public key SHALL NOT be able to read or write them.

#### Scenario: The public role reads interest

- **WHEN** the database's anonymous role selects from or inserts into the interest records
- **THEN** it is refused with a permission error

### Requirement: Interest can be counted for the demand gate

The number of production reports with recorded interest, and the share of production reports that have it, SHALL be answerable with one query on the server, leaving out test data.

**Unenforced:** the query is run by hand for the demand gate (T13); the unit test proves that test rows are marked and that one report counts once.

#### Scenario: Counting

- **WHEN** two production reports have interest, one tapped three times, and one test report has interest
- **THEN** the count of production reports with interest is 2
