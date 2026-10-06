## Purpose

Asks the four undertone questions from the approved canvas, one per step. The answers feed the classifier with the photo, or alone when there is no photo. The quiz never guesses an answer for the person.

## ADDED Requirements

### Requirement: Four questions in canvas order

The quiz SHALL ask four questions, one per step, in the order and wording of canvas artboards 06 (Quiz 1 to 4):

1. veins;
2. jewelry;
3. sun;
4. natural hair color.

Each option's label and description SHALL match the canvas. Each option's value SHALL be the core's quiz value for that question. "Hard to tell" SHALL be the value `unsure`. Each step SHALL show "Question n of 4", and the step progress SHALL mark Quiz as the current step.

#### Scenario: The first question

- **WHEN** the quiz starts
- **THEN** "Question 1 of 4" and "Look at the veins on your inner wrist in daylight. What color are they?" are shown, with the options "Green or olive", "Blue or purple", "A mix of both" and "Hard to tell"

#### Scenario: The last question

- **WHEN** the fourth question is shown
- **THEN** its primary action is "See my result"

### Requirement: No answer is chosen for the person

No option SHALL be selected when a question first shows. The step's primary action SHALL stay unavailable until an option is chosen.

#### Scenario: A fresh question

- **WHEN** question 2 first shows
- **THEN** no option is selected and "Next" cannot be used

### Requirement: Answers are kept within a visit

Going back to an answered question SHALL show the chosen option. Answers SHALL be kept when the person retakes the photo, after a rejection or from the reveal, so they are not asked again in the same visit. The analyze request SHALL carry every answered question, with "Hard to tell" sent as `unsure`.

#### Scenario: Back to an answered question

- **WHEN** a person who chose "Gold" on question 2 goes back to it from question 3
- **THEN** "Gold" is selected

#### Scenario: A retake after the quiz

- **WHEN** the analysis rejects the photo and the person's next photo passes
- **THEN** the analysis runs with the earlier answers, without showing the quiz again
