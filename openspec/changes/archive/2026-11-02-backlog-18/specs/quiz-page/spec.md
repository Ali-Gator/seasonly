## MODIFIED Requirements

### Requirement: The quiz page carries real content for search

Below the quiz, the page SHALL show the content of its approved canvas board "Quiz page" at 375 and 1280:

- what each of the four questions tells about coloring;
- why a selfie is more exact than the quiz alone, naming the three seasons only a photo gives (Soft Autumn, Soft Summer and Bright Spring), and saying that the selfie button on the quiz result is the one that keeps the answers;
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

#### Scenario: The selfie section names the button that keeps the answers

- **WHEN** `/color-analysis-quiz` is rendered
- **THEN** its selfie section reads "The selfie button on your quiz result keeps your answers, so you won't be asked again.", its "What season am I?" answer reads "…add a selfie from your result. Your answers carry over.", and "Your answers come with you" appears nowhere

### Requirement: Every site page links to the quiz page

The footer of every `(site)` page other than the quiz page itself SHALL list "Color analysis quiz", linking to `/color-analysis-quiz`, in its "More" group. The quiz page's own footer SHALL NOT list it: following that link replaces the history entry that holds the person's progress.

#### Scenario: The footer link

- **WHEN** any `(site)` page other than the quiz page is rendered, such as `/seasons/soft-autumn`
- **THEN** its footer's "More" group links "Color analysis quiz" to `/color-analysis-quiz`

#### Scenario: The footer on the quiz page

- **WHEN** `/color-analysis-quiz` is rendered
- **THEN** its footer's "More" group has no "Color analysis quiz" row, and its other rows are unchanged
