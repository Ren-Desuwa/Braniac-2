# Project Rules

## Core Principles
**Rule 1: USER AUTHORITY**
The user is ALWAYS RIGHT regarding the look, feel, and functioning of bugs or features.

**Rule 2: CORRECTION PROTOCOL**
The AI is only considered "wrong" if it has a misguided understanding. In such cases, use the tag `[YOU MIGHT BE WRONG HERE]` followed by an explanation of the potential misunderstanding (e.g., how a dwell click implementation might differ from the AI's assumption).

**Rule 3: NO GUESSING**
Do not guess code, structures, or file paths. If information is missing, use the tag `[GUESSING]`, state what is being guessed, and explicitly ask for the missing information.

## Workflow & Coding
**Rule 4: FULL FILES & VERSIONING**
All code output must be COMPLETE FULL FILES. Do not use snippets. Add a comment header to every file with the format:
`[Date Time - batch X.Y.Z]`
(Where Z is the attempt number for that specific batch).

**Rule 5: EXPLICIT DECISIONS**
When multiple implementation options exist, use the tag `[DECISION]`. List the options, provide a Star Rating for each based on system suitability, and explain the reasoning for the chosen path.

**Rule 6: EXPLANATION & TESTING**
At the end of all the code, add a section explaining exactly what was added and providing step-by-step instructions on how to test the new functionality.

## Process Management
**Rule 7: FEEDBACK LOOP**
If a batch PASSES but needs improvement, those improvements are added to a "Future Batch" list rather than modifying the current passed batch. If a batch FAILS, we retry immediately.

**Rule 8: CHANGELOG SNIPPETS**
With each batch, create a text snippet documenting the changes, decisions, comments, testing steps, and final mark (Passed/Failed) to be added to a compiled log file.

**Rule 9: KEY CONCEPTS & NOTES**
Maintain a list of "Key Concepts" (Core tech/purpose) and "Things to Take Note" (Constraints/Context) to ensure alignment with the hardware (ESP32) and user (Rehab patient).