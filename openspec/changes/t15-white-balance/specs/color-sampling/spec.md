## ADDED Requirements

### Requirement: Traits are white-balanced against the eye white

Sampling SHALL measure the eye white from the brightest part of both eye openings, the same measure the photo check uses, with 468 or 478 landmarks. It SHALL report the eye white beside the region colors, or report it as absent when the eye openings hold fewer than 50 usable pixels.

Before reducing colors to traits, sampling SHALL white-balance the skin, hair and eye colors against the eye white. The balance SHALL move each color by the eye white's offset from a fixed reference eye white measured on the labeled eval set, scaled by a fixed strength between 0 and 1. The region colors sampling reports SHALL stay the measured, unbalanced colors.

When the eye white is absent, or sits exactly at the reference, the traits SHALL equal the traits of the unbalanced colors. Every other rule for traits still applies to the balanced colors, including range, rounding and direction.

#### Scenario: A warm light cast

- **WHEN** a painted synthetic face with a painted eye white is sampled once as painted, and once with the whole image (eye white included) under a warm cast that stays below the photo check's tint limit
- **THEN** temperature moves between the two less than it moves when the same two images are reduced to traits without white balance

#### Scenario: The eye white is reported

- **WHEN** a synthetic face paints its eye openings a known light color and is sampled with 468 landmarks
- **THEN** the reported eye white is within ΔE 2 of the color painted there

#### Scenario: No usable eye white

- **WHEN** the eye openings hold fewer than 50 pixels inside the image
- **THEN** the eye white is reported as absent and the traits equal the traits of the unbalanced region colors

#### Scenario: An eye white at the reference

- **WHEN** the eye white equals the reference eye white
- **THEN** the traits equal the traits of the unbalanced region colors

#### Scenario: Region colors stay as measured

- **WHEN** a painted synthetic face is sampled with an eye white far from the reference
- **THEN** each reported region color is within ΔE 2 of the color painted there, and only the traits differ from the unbalanced ones

#### Scenario: Warmer skin under the same light

- **WHEN** two otherwise identical images, with the same eye white, differ only in a skin hue that is more yellow in the second
- **THEN** the second has the higher temperature
