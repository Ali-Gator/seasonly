## MODIFIED Requirements

### Requirement: The privacy policy says who runs Seasonly and how to use one's rights

`/privacy` SHALL give the operator's name and country and a contact email address. It SHALL say that a person can ask for a copy of their data, for its correction or for its deletion. It SHALL say that a request is answered within 30 days. It SHALL say what to send: the report link, or the email address. It SHALL say the person may complain to their data protection authority. It SHALL show the date it was last updated.

It SHALL state the basis for using the face crop and the rest of the data: they are needed to give the person the analysis and the report they asked for. It SHALL NOT name a consent screen as that basis, since the flow has none. The wording of the basis SHALL be approved by the user before it ships.

#### Scenario: Asking for deletion

- **WHEN** a person reads `/privacy`
- **THEN** it gives the contact address, says to send the report link or the email address, and says the request is answered within 30 days

#### Scenario: The basis for using the crop

- **WHEN** a person reads `/privacy`
- **THEN** it says the face crop is used because it is needed for the analysis the person asked for, and it does not mention a consent screen

#### Scenario: The privacy policy names the operator

- **WHEN** a person reads `/privacy`
- **THEN** it says Seasonly is run by an individual in Bulgaria, Oleg Gordienov

### Requirement: The terms state what the service is and its limits

`/terms` SHALL say:

- that a result is an estimate for choosing colors, not professional, medical or other advice;
- the minimum age for using the service;
- that a person may upload only a photo of themselves;
- that taking or uploading a photo sends a crop of the face for the analysis, as the privacy policy describes;
- that the service is provided as is, with no warranty, and the limits of liability;
- that the terms may change, and how changes are announced;
- the governing law, the operator's name and the operator's contact address.

It SHALL link to `/privacy` and show the date it was last updated.

The section with the contact address SHALL carry the id `contact`, so `https://seasonly.me/terms#contact` is the support URL the chat-plugin listings give. Since the listings' public URLs must identify the plugin's publisher, that section SHALL name the operator.

#### Scenario: Reading the terms

- **WHEN** a person reads `/terms`
- **THEN** it states the result is an estimate, the minimum age, own photos only, that a photo sends a face crop for the analysis, no warranty, the governing law and the contact address, and links to `/privacy`

#### Scenario: The support link

- **WHEN** `/terms` is rendered
- **THEN** a `section` with `id="contact"` holds the "Law and contact" heading and the `mailto:care@seasonly.me` link

#### Scenario: The terms name the operator

- **WHEN** `/terms` is rendered
- **THEN** the `section` with `id="contact"` says Seasonly is run by an individual in Bulgaria, Oleg Gordienov
