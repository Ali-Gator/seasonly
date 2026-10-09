## MODIFIED Requirements

### Requirement: A filter is judged from skin color no natural skin has

The check SHALL report `filter` when the skin color is near-gray, more saturated than the maximum skin chroma, or of a hue outside the natural skin range. Every tone of the Monk Skin Tone scale, under neutral light, SHALL pass. Skin that daylight or flash renders slightly pink-red, just below hue 0°, SHALL pass.

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

#### Scenario: Skin just below hue 0°

- **WHEN** a face's skin reads hue −5° at C*ab 9, as one usable daylight photo in the eval set reads
- **THEN** no problem is reported
