## MODIFIED Requirements

### Requirement: The landing's camera link opens the flow on the camera

`/analyze?start=camera` SHALL open the flow on the capture step instead of the photo guide. The capture step SHALL then be the flow's first entry, so the browser's Back from it leaves the flow for the page before it. Once the flow has opened, the address SHALL drop the parameter and keep the rest: the path, every other query parameter and the hash, so a reload starts at the photo guide as on any other visit. Next's router SHALL then hold that same address, so a router refresh or a server action on `/analyze` does not write the parameter back. Syncing the router SHALL NOT discard a link tap made while the page hydrates. Any other value of `start`, or none, SHALL open the photo guide. This opening is the one step change that adds no history entry. Removing `start`, and removing the quiz page's answers ("Answers from the quiz page skip the quiz"), are the only changes to the address inside the flow; these exceptions hold over "The flow stays on one URL" here and over site-structure's "without changing the URL".

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

#### Scenario: The router sync runs before a replayed tap

- **WHEN** the flow's mount effects run on `/analyze?start=camera`
- **THEN** the router sync has run by the end of the current task's microtasks, before a tap that hydration replays can start a navigation, and StrictMode's second run still syncs only once
