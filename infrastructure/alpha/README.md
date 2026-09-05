# Private Alpha Test

Run a private alpha with 5-10 invited users before opening Vrompt to a broader
audience. Give each tester a temporary support contact and a task sheet.

## Test tasks

1. Sign in with Google and open `/chat`.
2. Send a request with Auto and confirm streaming output appears incrementally.
3. Select an enabled model manually and compare the response.
4. Stop a response, then regenerate a completed assistant message.
5. Upload a supported PDF, PNG, or JPEG; confirm it is private and removable.
6. Try an unsupported or oversized file and confirm it is rejected safely.
7. Save a reusable prompt, insert it into chat, and edit it later.
8. Rename and delete a conversation; confirm its files are deleted too.
9. Review daily/monthly usage and test the allowance message at the limit.
10. Open another user's conversation URL and confirm no private content is exposed.

## Observe

Record task success, time-to-completion, confusing labels, accessibility barriers,
provider failures, and quota errors using `feedback-template.md`. Never record
tokens, passwords, private chat content, or unredacted screenshots.

## Exit criteria

- At least five testers complete the core chat, files, privacy, and usage tasks.
- No unresolved authentication, authorization, private-content, data-loss, or unsafe-file blocker.
- Every S1/S2 issue has reproduction steps, an owner, and a release decision.
