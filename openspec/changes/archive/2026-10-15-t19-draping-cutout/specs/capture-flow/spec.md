## MODIFIED Requirements

### Requirement: Only a face crop is uploaded

The upload SHALL hold only a crop of the face, never the whole photo. The crop SHALL be the face landmarks' bounding box widened by a margin on every side and clamped to the image. It SHALL be scaled down to at most 512 px on its longer side and encoded as JPEG. The traits SHALL be measured from the full photo the check passed, before cropping.

With the crop, the upload SHALL carry the crop's outline when the device can make one. The outline is a PNG with exactly the crop's width and height. Its alpha is the person segmenter's confidence that each pixel shows the person, so the background is transparent. The outline SHALL be made on the device from the crop alone. It SHALL change neither the crop nor the traits. When the person segmenter fails to load or to run, the photo SHALL still pass, and the upload SHALL carry the crop and the traits without an outline.

#### Scenario: A large photo

- **WHEN** a 3000 × 4000 photo with a face 1200 px wide passes
- **THEN** the uploaded crop is a JPEG no larger than 512 px on its longer side and contains the whole face box

#### Scenario: The crop's outline

- **WHEN** a photo passes and the person segmenter runs on its crop
- **THEN** the upload carries a PNG outline with the crop's width and height, opaque on the person and transparent on the background

#### Scenario: No person segmenter

- **WHEN** a photo passes but the person segmenter failed to load
- **THEN** the photo is not asked to be retaken, and the upload carries the crop and the traits without an outline

### Requirement: Nothing leaves the device before the quiz is finished

The photo, its face crop, the crop's outline and its traits SHALL NOT be sent anywhere before the person answers the quiz's last question. They SHALL be sent only with the analyze request. A person who leaves the flow before that sends nothing, whether by Back, by closing the page or by reloading it. The full photo SHALL never be sent.

#### Scenario: Leaving during the quiz

- **WHEN** a person whose photo passed answers two questions and then goes Back to the photo guide
- **THEN** no request has gone to the analyze route

#### Scenario: The quiz is finished

- **WHEN** the person answers the last question
- **THEN** one analyze request carries the answers, the traits and the face crop

#### Scenario: The quiz is finished with an outline

- **WHEN** the person whose photo passed with an outline answers the last question
- **THEN** that one analyze request also carries the outline, and no other request carries it
