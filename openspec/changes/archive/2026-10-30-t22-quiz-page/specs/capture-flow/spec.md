## ADDED Requirements

### Requirement: Answers from the quiz page skip the quiz

`/analyze` SHALL accept the quiz page's four answers in its address as `veins`, `jewelry`, `sun` and `hair` query parameters. When all four are present and each is a value the core accepts for its question (`unsure` included), the flow SHALL keep them as the person's answers and treat the quiz as done: it opens on the photo guide as usual, and once a photo passes the check, or the person continues with the quiz only after two failed checks, the analysis SHALL run with those answers without showing the quiz. When any of the four is missing or not accepted, the flow SHALL ignore all four and run as if none were given. Either way, once the flow has opened, the address SHALL drop the four parameters and keep the path, every other query parameter and the hash, as it does for `start`; a reload then starts at the photo guide with no answers. Nothing SHALL be sent before the photo passes or the quiz-only path is chosen, as "Nothing leaves the device before the quiz is finished" requires.

#### Scenario: Opening with the quiz page's answers

- **WHEN** `/analyze?veins=green&jewelry=gold&sun=burn-tan&hair=dark&utm_source=tiktok` opens
- **THEN** the photo guide is shown and the address reads `/analyze?utm_source=tiktok`

#### Scenario: A passing photo goes straight to the analysis

- **WHEN** a person who opened `/analyze` with the quiz page's answers takes a photo that passes the check
- **THEN** one analyze request carries those four answers with the traits and the crop, and no quiz question was shown

#### Scenario: The quiz-only path keeps the answers

- **WHEN** a person who opened `/analyze` with the quiz page's answers fails the check twice and chooses "Continue with the quiz only"
- **THEN** one analyze request carries those four answers and no crop, and no quiz question was shown

#### Scenario: An answer the core does not accept

- **WHEN** `/analyze?veins=purple&jewelry=gold&sun=burn-tan&hair=dark` opens and a photo then passes
- **THEN** the address reads `/analyze` and the quiz starts at question 1 with no answer chosen

#### Scenario: Reload after opening with answers

- **WHEN** a person who opened `/analyze` with the quiz page's answers reloads the page and a photo then passes
- **THEN** the quiz starts at question 1 with no answer chosen

## MODIFIED Requirements

### Requirement: The landing's camera link opens the flow on the camera

`/analyze?start=camera` SHALL open the flow on the capture step instead of the photo guide. The capture step SHALL then be the flow's first entry, so the browser's Back from it leaves the flow for the page before it. Once the flow has opened, the address SHALL drop the parameter and keep the rest: the path, every other query parameter and the hash, so a reload starts at the photo guide as on any other visit. Next's router SHALL then hold that same address, so a router refresh or a server action on `/analyze` does not write the parameter back. Any other value of `start`, or none, SHALL open the photo guide. This opening is the one step change that adds no history entry. Removing `start`, and removing the quiz page's answers ("Answers from the quiz page skip the quiz"), are the only changes to the address inside the flow; these exceptions hold over "The flow stays on one URL" here and over site-structure's "without changing the URL".

#### Scenario: Opening on the camera

- **WHEN** `/analyze?start=camera` opens
- **THEN** the capture step is shown, the photo guide is not, and the address reads `/analyze`

#### Scenario: Back from the camera

- **WHEN** a person taps "Take a selfie" on the landing and then presses the browser's Back on the capture step
- **THEN** the landing is shown

#### Scenario: Reload after opening on the camera

- **WHEN** a person who opened `/analyze?start=camera` reloads the page
- **THEN** the photo guide is shown

#### Scenario: An unknown start

- **WHEN** `/analyze?start=quiz` opens
- **THEN** the photo guide is shown

#### Scenario: Other parameters and the hash are kept

- **WHEN** `/analyze?start=camera&utm_source=tiktok#guide` opens
- **THEN** the capture step is shown and the address reads `/analyze?utm_source=tiktok#guide`

#### Scenario: A router refresh after opening on the camera

- **WHEN** a person opens `/analyze?start=camera`, from the landing's link or as a fresh load, and Next's router then refreshes the page
- **THEN** the address still reads `/analyze` and the capture step is still shown

#### Scenario: The camera link with the quiz page's answers

- **WHEN** `/analyze?start=camera&veins=green&jewelry=gold&sun=burn-tan&hair=dark` opens
- **THEN** the capture step is shown, the address reads `/analyze`, and a passing photo goes straight to the analysis without the quiz
