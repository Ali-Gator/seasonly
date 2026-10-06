## MODIFIED Requirements

### Requirement: Each problem has its own retake tip

Each of the four problems SHALL have its own retake tip, and so SHALL `several-faces`. The check never reports `several-faces`: the web flow detects it from the face count, and the vision call can report it too. A tip has a title, a message saying what is wrong, a tip saying how to retake, and an icon name. All five SHALL be distinct. Each of the four SHALL equal the copy of its screen on the approved MVP canvas (`BadNoFace`, `BadDark`, `BadTint`, `BadFilter`). The several-faces tip SHALL equal the copy approved for it on the canvas.

#### Scenario: Four bad photos, four tips

- **WHEN** a no-face, a dark, a tinted and a filtered photo are each checked
- **THEN** each reports its own problem, and the four retake tips are distinct

#### Scenario: Tips match the canvas

- **WHEN** the retake tips are read
- **THEN** each title, message, tip and icon equals the copy on its canvas screen

#### Scenario: Several faces has its own tip

- **WHEN** the several-faces tip is read
- **THEN** it differs from the other four and equals its approved canvas copy

### Requirement: Darkness is judged from the eye whites, not the skin

The check SHALL report `dark` when the eye whites are darker than the minimum lightness. It SHALL NOT judge darkness from skin lightness, so deep skin in good light passes.

#### Scenario: A light-skinned face, underexposed

- **WHEN** a photo of a light-skinned face that passes is darkened to a fifth of its brightness
- **THEN** `dark` is reported

#### Scenario: A deep-skinned face in good light

- **WHEN** a face with the deepest Monk Skin Tone and bright neutral eye whites is checked
- **THEN** no problem is reported

#### Scenario: A dim indoor selfie

- **WHEN** a photo of a light-skinned face that passes is darkened to a third of its brightness, so its eye whites read L* 33 as in real indoor selfies
- **THEN** no problem is reported

### Requirement: A color cast is judged from the eye whites

The check SHALL report `tint` when the eye whites are more colorful than the maximum eye-white chroma, in any direction.

#### Scenario: Warm lamp light

- **WHEN** a photo that passes has its blue channel scaled down so the eye whites turn yellow
- **THEN** `tint` is reported

#### Scenario: Cool light

- **WHEN** a photo that passes has its red channel scaled down so the eye whites turn blue-green
- **THEN** `tint` is reported

#### Scenario: Warm indoor light

- **WHEN** a photo that passes is warmed slightly, so its eye whites read C*ab 19 as in real indoor selfies
- **THEN** no problem is reported

### Requirement: A filter is judged from skin color no natural skin has

The check SHALL report `filter` when the skin color is near-gray, more saturated than the maximum skin chroma, or of a hue outside the natural skin range. Every tone of the Monk Skin Tone scale, under neutral light, SHALL pass.

#### Scenario: A black-and-white photo

- **WHEN** a photo that passes is converted to grayscale
- **THEN** `filter` is reported

#### Scenario: A pink filter on the skin

- **WHEN** a photo's skin is turned magenta while its eye whites stay neutral
- **THEN** `filter` is reported

#### Scenario: Every skin tone passes

- **WHEN** a face is painted in each of the 10 Monk Skin Tone colors, with neutral eye whites
- **THEN** no problem is reported for any of them

#### Scenario: Skin reddened by dim warm light

- **WHEN** a face's skin reads hue 20°, as a webcam reads skin in dim warm light
- **THEN** no problem is reported
