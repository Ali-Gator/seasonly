## MODIFIED Requirements

### Requirement: Four questions in canvas order

The quiz SHALL ask four questions, one per step, in the order and wording of canvas artboards 06 (Quiz 1 to 4):

1. veins;
2. jewelry;
3. sun;
4. natural hair color.

Each option's label and description SHALL match the canvas. Each option's value SHALL be the core's quiz value for that question. "Hard to tell" SHALL be the value `unsure`. Each step SHALL show one progress row, "Step 2 of 3 · Question n of 4", where the step progress marks Quiz as the current step and fills its bar by the share of questions reached. There SHALL be no second "Question n of 4" line.

#### Scenario: The first question

- **WHEN** the quiz starts
- **THEN** "Step 2 of 3 · Question 1 of 4" and "Look at the veins on your inner wrist in daylight. What color are they?" are shown, with the options "Green or olive", "Blue or purple", "A mix of both" and "Hard to tell", and "Question 1 of 4" appears only once

#### Scenario: The last question

- **WHEN** the fourth question is shown
- **THEN** its progress reads "Question 4 of 4" and its primary action is "See my result"

### Requirement: No answer is chosen for the person

No option SHALL be selected when a question first shows. The step's primary action SHALL stay unavailable until an option is chosen.

When an option is chosen with a pointer (a tap or a click), the quiz SHALL move to the next question on its own after a short pause that shows the choice, about 300 ms. On the last question it SHALL NOT move on: the person still chooses "See my result". A choice made with the keyboard SHALL NOT move on, because arrow keys move through the options; the person moves on with "Next". Above the options, the quiz SHALL say "Tap an answer to go on." so the move is never a surprise.

#### Scenario: A fresh question

- **WHEN** question 2 first shows
- **THEN** no option is selected and "Next" cannot be used

#### Scenario: A tap moves on

- **WHEN** the person taps "Gold" on question 2
- **THEN** "Gold" shows as chosen, and question 3 is shown about 300 ms later

#### Scenario: The keyboard does not move on

- **WHEN** the person moves to "Silver" on question 2 with an arrow key
- **THEN** "Silver" is chosen, question 2 stays on screen, and "Next" can be used

#### Scenario: The last question waits

- **WHEN** the person taps an option on question 4
- **THEN** question 4 stays on screen and "See my result" can be used

#### Scenario: A tap on an answered question

- **WHEN** the person goes back to question 2, where "Gold" is chosen, and taps "Gold" again
- **THEN** question 3 is shown

## ADDED Requirements

### Requirement: Questions answered by looking show example photos

The veins, jewelry and hair questions SHALL show an example photo in each option except "Hard to tell": a wrist with that vein color, gold or silver jewelry (both metals for "Both look fine"), and that hair color. The vein and hair photos SHALL show the site's fictional example person or her wrist, never a real person; the jewelry photos show the metals alone. Each photo SHALL have alt text that names what it shows. The sun question SHALL have no photos.

#### Scenario: The veins question

- **WHEN** question 1 is shown
- **THEN** "Green or olive", "Blue or purple" and "A mix of both" each show an image with non-empty alt text, and "Hard to tell" shows none

#### Scenario: The sun question

- **WHEN** question 3 is shown
- **THEN** no option shows an image
