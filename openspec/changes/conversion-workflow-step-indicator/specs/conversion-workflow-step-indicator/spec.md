## ADDED Requirements

### Requirement: Visible conversion workflow step indicator
During an active export, the popup SHALL present the current position in the conversion workflow as a persistent step indicator showing the capturing, converting, optional locally summarizing, and copying steps. The indicator SHALL identify the currently active step, visually distinguish completed steps from the active and remaining steps, and SHALL remain visible while processing is underway. The popup SHALL retain its existing accessible live status message alongside the indicator.

#### Scenario: Processing without Browser summarization
- **WHEN** the user activates Build Markdown with provider None or Custom and the export is processing
- **THEN** the popup SHALL show a step indicator whose current step advances from capturing to converting to copying as the workflow progresses

#### Scenario: Processing with Browser summarization
- **WHEN** the user activates Build Markdown with Browser summarization below Detail 100 and the final export invokes Chrome's local summarizer
- **THEN** the popup SHALL show the locally summarizing step as active before copying, and SHALL identify local summarization before the automatic-copy behavior applies

#### Scenario: Optional step omitted
- **WHEN** the export never invokes local summarization
- **THEN** the popup SHALL present only the capturing, converting, and copying steps and SHALL NOT show a local summarization step

#### Scenario: Accessible step announcement
- **WHEN** the step indicator changes to a new current step
- **THEN** the popup SHALL expose the new current step to assistive technology through the existing live status region
