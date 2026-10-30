## Purpose

Puts the four-question quiz on its own indexable page, `/color-analysis-quiz`, for people searching "color analysis quiz" or "what season am I". The page gives a season family from the quiz alone in the browser, then offers a selfie as the next step without asking the questions again.

## ADDED Requirements

### Requirement: The quiz page asks the four questions in its first screen

`/color-analysis-quiz` SHALL show, under its h1 "Color analysis quiz: what season am I?" and a one-paragraph lead, the four questions of the flow's quiz (quiz spec): the same order, legends, options, descriptions, values and example photos. The first question SHALL be in the server-rendered HTML. Each question's legend SHALL be an h2, so the page has exactly one h1. Above the options SHALL be a progress line "Question n of 4". As in the flow, no option SHALL be chosen when a question first shows, a pointer choice SHALL move on after about 300 ms except on the last question, a keyboard choice SHALL NOT move on, and "Tap an answer to go on." SHALL show above every question but the last. Questions 2 to 4 SHALL offer a "Back" action to the previous question. Question 1 SHALL offer none. The last question's primary action SHALL be "See my result".

#### Scenario: The page opens on question 1

- **WHEN** `/color-analysis-quiz` is requested
- **THEN** the HTML holds one h1 "Color analysis quiz: what season am I?", the progress "Question 1 of 4", the veins question as an h2 with its four options, no option chosen, and no "Back" action

#### Scenario: A tap moves on, as in the flow

- **WHEN** the person taps "Green or olive" on question 1
- **THEN** "Question 2 of 4" and the jewelry question show about 300 ms later, with a "Back" action

#### Scenario: The last question waits for the person

- **WHEN** the person taps an option on question 4
- **THEN** question 4 stays on screen and "See my result" can be used

### Requirement: Each quiz page step is a browser history entry that keeps the answers

Each move to the next question, and to the result, SHALL add one browser history entry that holds the step and the answers so far. The browser's Back SHALL show the previous step with its answer still chosen, and Forward the next one. Coming back to the page's entry from another page, or reloading the page, SHALL show the step and answers that entry holds. The page's address SHALL stay `/color-analysis-quiz`, with any query it was opened with.

#### Scenario: Back inside the quiz

- **WHEN** a person on question 3 presses the browser's Back
- **THEN** question 2 is shown with its earlier answer chosen, and the address is still `/color-analysis-quiz`

#### Scenario: Back from the photo guide returns to the result

- **WHEN** a person who saw their result chose "Add a selfie for your exact season" and then presses the browser's Back on the photo guide
- **THEN** the quiz page shows the same result again, without asking the questions

#### Scenario: Reload on the result

- **WHEN** a person reloads the quiz page while their result is shown
- **THEN** the same result is shown

### Requirement: The result is the quiz-alone season family, worked out in the browser

"See my result" SHALL show the result the chat plugin gives for the same answers (chat-plugin, "The tool gives the web quiz's season"): the season family's name, its tagline, its reveal line, its 6 highlight colors each with its name and uppercase hex, and the note "From the quiz alone. A selfie gives your exact season and all 30 colors." The result SHALL be worked out in the browser: answering the quiz and seeing the result SHALL send no request to any Seasonly API route, and SHALL save no report.

#### Scenario: A Summer result

- **WHEN** the person answers blue veins, silver jewelry, burns rarely tans and blonde hair, and chooses "See my result"
- **THEN** the page names the Summer family with Summer's tagline, reveal line and 6 highlight colors with their hex codes, and the quiz-alone note

#### Scenario: The page and the plugin agree

- **WHEN** any combination of the four answers is shown on the quiz page and given to the plugin's tool
- **THEN** both name the same family and the same 6 colors, or both give no result for the same reason

#### Scenario: Nothing is sent

- **WHEN** the person answers all four questions and sees their result
- **THEN** no request has gone to `/api/`

### Requirement: Answers that point to no season get an answer, not a guess

When the quiz alone gives no result (season-classifier: `no-answers` or `answers-cancel`), the page SHALL show the plugin's title "These answers don't point to one season" and its message for that reason, and no family or colors.

#### Scenario: Every answer is "Hard to tell"

- **WHEN** the person answers "Hard to tell" to all four questions and chooses "See my result"
- **THEN** the page shows "These answers don't point to one season" with the `no-answers` message, and no season family

#### Scenario: Answers that cancel out

- **WHEN** the person answers green veins and silver jewelry, then "Hard to tell" twice, and chooses "See my result"
- **THEN** the page shows the `answers-cancel` message

### Requirement: The photo is the next step, with the answers kept

The result and the no-result SHALL each offer two actions:

1. a primary link, "Add a selfie for your exact season" on a result and "Let a selfie read your colors" on a no-result, to `/analyze?veins=<value>&jewelry=<value>&sun=<value>&hair=<value>` carrying the four answers as given, `unsure` included;
2. "Change my answers", which shows question 1 with every answer still chosen.

The flow then skips the quiz (capture-flow, "Answers from the quiz page skip the quiz").

#### Scenario: The selfie link carries the answers

- **WHEN** a person who answered green, gold, burn-tan and dark sees their result
- **THEN** "Add a selfie for your exact season" links to `/analyze?veins=green&jewelry=gold&sun=burn-tan&hair=dark`

#### Scenario: Changing the answers

- **WHEN** the person chooses "Change my answers" on the result
- **THEN** question 1 is shown with their first answer chosen

### Requirement: The quiz page carries real content for search

Below the quiz, the page SHALL show the content of its approved canvas board "Quiz page" at 375 and 1280:

- what each of the four questions tells about coloring;
- why a selfie is more exact than the quiz alone, naming the three seasons only a photo gives (Soft Autumn, Soft Summer and Bright Spring);
- the four season families, linking to all 12 season pages;
- a short list of questions and answers in How it works' expandable style, one of them answering "What season am I?".

Its main content, counted without the site header and footer and without the quiz's own options, SHALL hold at least 250 words. It SHALL render no bracketed upper-case placeholder text and no photo slot showing a label instead of an image. The page SHALL be marked ready in the route map, so it carries no `noindex`, states its canonical URL and is listed in the sitemap.

#### Scenario: The word floor without the quiz

- **WHEN** the main content of `/color-analysis-quiz` is counted, without the header, footer and the quiz's fieldset
- **THEN** it holds at least 250 words and no placeholder text

#### Scenario: Every season page is linked

- **WHEN** `/color-analysis-quiz` is rendered
- **THEN** it links to each of the 12 `/seasons/<slug>` pages

#### Scenario: The quiz page is indexed

- **WHEN** `/color-analysis-quiz` is fetched
- **THEN** it carries no `noindex`, its canonical link is `https://seasonly.me/color-analysis-quiz`, and the sitemap lists that URL

### Requirement: Every site page links to the quiz page

The footer of every `(site)` page SHALL list "Color analysis quiz", linking to `/color-analysis-quiz`, in its "More" group.

#### Scenario: The footer link

- **WHEN** any `(site)` page is rendered, such as `/seasons/soft-autumn`
- **THEN** its footer's "More" group links "Color analysis quiz" to `/color-analysis-quiz`
