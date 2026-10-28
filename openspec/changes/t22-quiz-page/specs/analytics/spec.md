## ADDED Requirements

### Requirement: The quiz page reports its result without the answers

The quiz page SHALL send one `quiz_page_completed` event each time the person chooses "See my result" with the last question answered. Its only property SHALL be `result`: the family (`spring`, `summer`, `autumn` or `winter`) when there is one, else the no-result reason (`no-answers` or `answers-cancel`). It SHALL NOT carry the answers. Showing a result again from the browser's history or a reload SHALL NOT send it again. The hand-off to the photo needs no event of its own: it is the `/analyze` `$pageview` whose URL still carries the four answer parameters, as the camera link's pageview still carries `?start=camera`. A flow opened with the quiz page's answers SHALL NOT send `quiz_completed`, since its quiz is not shown.

#### Scenario: A result on the quiz page

- **WHEN** a person answers blue veins, silver jewelry, burns rarely tans and blonde hair, and chooses "See my result"
- **THEN** PostHog receives one `quiz_page_completed` with `result: "summer"` and no other property

#### Scenario: A no-result on the quiz page

- **WHEN** a person answers "Hard to tell" four times and chooses "See my result"
- **THEN** PostHog receives one `quiz_page_completed` with `result: "no-answers"`

#### Scenario: The result shown again

- **WHEN** a person on the result goes to `/analyze` and comes Back to the result, or reloads it
- **THEN** no second `quiz_page_completed` is sent

#### Scenario: From the quiz page to the photo

- **WHEN** a person chooses "Add a selfie for your exact season" and a photo then passes
- **THEN** PostHog receives `$pageview` (`/analyze`) once, its URL carrying the four answers, then `photo_checked` and `analysis_result`, and no `quiz_completed`
