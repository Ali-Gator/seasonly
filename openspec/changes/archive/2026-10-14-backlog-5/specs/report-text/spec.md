## MODIFIED Requirements

### Requirement: Only the face crop is sent

A call SHALL carry exactly one image, the face crop it was given, and no other photo or personal data. The crop SHALL be sent as a file with its media type (`image/jpeg`), the form the AI SDK keeps, so a call logs no deprecation warning.

Zero data retention is not requested: the AI Gateway offers it only on Vercel Pro and Enterprise plans, and the project is on Hobby. The provider's own retention policy applies, and the privacy page says so.

#### Scenario: The request's image

- **WHEN** personal text is requested
- **THEN** the request carries one image, equal to the given face crop

#### Scenario: No deprecation warning

- **WHEN** personal text is requested
- **THEN** the AI SDK logs no warning that names a deprecated content part
