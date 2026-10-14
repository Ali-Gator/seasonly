## MODIFIED Requirements

### Requirement: The terms state what the service is and its limits

`/terms` SHALL say:

- that a result is an estimate for choosing colors, not professional, medical or other advice;
- the minimum age for using the service;
- that a person may upload only a photo of themselves;
- that taking or uploading a photo sends a crop of the face for the analysis, as the privacy policy describes;
- that the service is provided as is, with no warranty, and the limits of liability;
- that the terms may change, and how changes are announced;
- the governing law, and the operator's contact address.

It SHALL link to `/privacy` and show the date it was last updated.

The section with the contact address SHALL carry the id `contact`, so `https://seasonly.me/terms#contact` is the support URL the chat-plugin listings give.

#### Scenario: Reading the terms

- **WHEN** a person reads `/terms`
- **THEN** it states the result is an estimate, the minimum age, own photos only, that a photo sends a face crop for the analysis, no warranty, the governing law and the contact address, and links to `/privacy`

#### Scenario: The support link

- **WHEN** `/terms` is rendered
- **THEN** a `section` with `id="contact"` holds the "Law and contact" heading and the `mailto:care@seasonly.me` link
