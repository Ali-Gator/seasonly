## MODIFIED Requirements

### Requirement: The job deletes face crops older than 24 hours

Each run of the retention job SHALL delete every object in the `crops` bucket that was created more than 24 hours before the run, and SHALL leave every younger object. The bucket holds, at its root, one `<report id>.jpg` crop per photo report and, when the phone made one, its `<report id>.mask.png` outline. A crop or an outline is selected by its age alone, so one that a missed or failed run left behind is deleted by the next run that succeeds. The job SHALL delete every old object however many there are, not only the first page of a listing.

#### Scenario: An old crop

- **WHEN** the job runs and a crop was stored 25 hours earlier
- **THEN** the crop is deleted and `/api/face/<id>` answers 404

#### Scenario: An old outline

- **WHEN** the job runs and a crop and its outline were stored 25 hours earlier
- **THEN** both are deleted, and `/api/face/<id>` and `/api/face/<id>/mask` answer 404

#### Scenario: A young crop

- **WHEN** the job runs and a crop was stored 23 hours earlier
- **THEN** the crop is kept

#### Scenario: After a missed run

- **WHEN** one daily run did not happen and the next run finds crops stored 47 hours earlier
- **THEN** those crops are deleted

#### Scenario: More old crops than one listing holds

- **WHEN** the job runs and 250 crops are older than 24 hours
- **THEN** all 250 are deleted

### Requirement: A deletion request is honored within 30 days

A request sent to the contact address on `/privacy` SHALL be answered within 30 days. A request that gives a report link SHALL delete that report's record, its addresses, its interest record, its crop and the crop's outline. A request that gives only an email address SHALL delete every stored copy of that address. It SHALL keep the reports the address was stored under, because the address alone does not show who owns them.

**Unenforced:** requests are handled by hand, following the procedure in `docs/privacy-requests.md`. The procedure is tried once on a test report, and the result is recorded in the change's tasks.

#### Scenario: A request with a report link

- **WHEN** a person sends their report link and asks for deletion
- **THEN** the report, its addresses, its interest record, its crop and its outline are deleted, and the link answers 404

#### Scenario: A request with an address only

- **WHEN** a person sends only their email address and asks for deletion
- **THEN** that address is removed from every report it was stored under, and those reports remain
