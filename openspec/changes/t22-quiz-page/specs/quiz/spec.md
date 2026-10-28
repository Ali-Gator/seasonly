## MODIFIED Requirements

### Requirement: Four questions in canvas order

The quiz SHALL ask four questions, one per step, in the order and wording of canvas artboards 06 (Quiz 1 to 4):

1. veins;
2. jewelry;
3. sun;
4. natural hair color.

Each option's label and description SHALL match the canvas. Each option's value SHALL be the core's quiz value for that question. "Hard to tell" SHALL be the value `unsure`. Inside the analysis flow, each step SHALL show one progress row, "Step 2 of 3 · Question n of 4", where the step progress marks Quiz as the current step and fills its bar by the share of questions reached. There SHALL be no second "Question n of 4" line. On the quiz page the same questions show that page's own progress instead (quiz-page, "The quiz page asks the four questions in its first screen").

#### Scenario: The first question

- **WHEN** the quiz starts
- **THEN** "Step 2 of 3 · Question 1 of 4" and "Look at the veins on your inner wrist in daylight. What color are they?" are shown, with the options "Green or olive", "Blue or purple", "A mix of both" and "Hard to tell", and "Question 1 of 4" appears only once

#### Scenario: The last question

- **WHEN** the fourth question is shown
- **THEN** its progress reads "Question 4 of 4" and its primary action is "See my result"

#### Scenario: The questions on the quiz page

- **WHEN** question 1 is shown on `/color-analysis-quiz`
- **THEN** it reads "Question 1 of 4" with the same legend and options as in the flow, and no "Step 2 of 3" appears
