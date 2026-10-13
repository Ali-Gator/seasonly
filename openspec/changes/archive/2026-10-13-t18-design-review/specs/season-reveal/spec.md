## MODIFIED Requirements

### Requirement: The analyzing step follows the canvas and fails visibly

While the request runs, the flow SHALL show the analyzing screen of canvas artboard 07, with these parts:

- the face crop, or no image on the quiz-only path;
- "Reading your colors";
- a progress bar;
- the four step lines.

When the request fails, the flow SHALL show the error screen of canvas artboard 08d, which offers to try again. A failure is a network error, a non-success answer other than 403, or no answer within 45 s. Trying again SHALL re-send the same request.

When the analyze route answers 403, the browser was refused by the bot check, and sending again cannot succeed. The flow SHALL show the blocked screen of canvas artboard 08g instead: the heading "We couldn’t check this browser", the line "Some in-app browsers block our check. Open seasonly.me in Safari or Chrome to continue.", and an action "Copy the link" that copies `https://seasonly.me/analyze` and then reads "Link copied". It SHALL NOT offer "Try again".

#### Scenario: The route fails

- **WHEN** the analyze route answers 500
- **THEN** the error screen is shown, and choosing to try again sends the same request

#### Scenario: The route refuses the request

- **WHEN** the analyze route answers 403
- **THEN** the blocked screen reads "We couldn’t check this browser", offers "Copy the link", and offers no "Try again"

#### Scenario: Copying the link

- **WHEN** the person chooses "Copy the link" on the blocked screen
- **THEN** `https://seasonly.me/analyze` is on the clipboard and the action reads "Link copied"
