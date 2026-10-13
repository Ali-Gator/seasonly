## MODIFIED Requirements

### Requirement: Darkness is judged from the eye whites, not the skin

The check SHALL report `dark` when the eye whites are darker than the minimum lightness. It SHALL NOT judge darkness from skin lightness, so deep skin in good light passes. Lid, lash and iris pixels inside the eye openings SHALL NOT pull the eye white down to the skin's depth.

#### Scenario: A light-skinned face, underexposed

- **WHEN** a photo of a light-skinned face that passes is darkened to a fifth of its brightness
- **THEN** `dark` is reported

#### Scenario: A deep-skinned face in good light

- **WHEN** a face with the deepest Monk Skin Tone and bright neutral eye whites is checked
- **THEN** no problem is reported

#### Scenario: A dim indoor selfie

- **WHEN** a photo of a light-skinned face that passes is darkened to a third of its brightness, so its eye whites read L* 33 as in real indoor selfies
- **THEN** no problem is reported

#### Scenario: Deep skin with lids covering most of each eye opening

- **WHEN** a face with the deepest Monk Skin Tone in good light is checked with 478 landmarks, its dark irises filling half of each eye opening and lid-colored skin covering three quarters of the rest, the remaining quarter bright neutral sclera
- **THEN** no problem is reported
