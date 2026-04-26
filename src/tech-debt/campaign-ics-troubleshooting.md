# Campaign ICS Import Troubleshooting Notes

Date: 2026-04-26
Module: Campaign Content Posting (`/campaigns`)

## Symptom: `.ics` import fails in Apple Calendar / Outlook

1. Confirm the download opened with UTF and `BEGIN:VCALENDAR`/`BEGIN:VEVENT`.
2. Re-export from the same claim using "Download ICS" and verify file extension remains `.ics`.
3. If import still fails, open the downloaded file in a text editor:
   - Required block names are present: `BEGIN:VCALENDAR`, `VERSION`, `BEGIN:VEVENT`, `END:VEVENT`, `END:VCALENDAR`.
   - `DTSTART`, `DTEND`, and `DTSTAMP` are UTC or include an explicit timezone offset.
4. If fields are present, import from a clean calendar profile:
   - Apple Calendar: File → Import → select `.ics`.
   - Outlook: File → Open → Import calendar.
5. If import works only from one client, use that client for immediate execution and log the client/version in release notes until compatibility issue is resolved.

## Fallback remediation

- Use module deep-link for reminder context:
  - Open campaign claim in app and create a native calendar invite manually from the browser with the same scheduled time.
- Share raw ICS content in Slack/email only if corporate policy allows and the recipient can copy it into a local ICS file.

## Rollback

- If repeated imports fail after validation, disable ICS UI for the campaign module temporarily while continuing reminders via in-app notes.
- Re-enable once `.ics` payload compatibility is corrected in code and validated on affected clients.

## Signoff linkage

- Reference this note from:
  - [US-CMP-QA-1113-ics-import-platform-verification.md](/.github/user-stories/oliver-app/backlog/campaign-content-posting-module-2026-04-25/US-CMP-QA-1113-ics-import-platform-verification.md)
  - [US-CMP-QA-1114-staging-signoff-evidence-package.md](/.github/user-stories/oliver-app/backlog/campaign-content-posting-module-2026-04-25/US-CMP-QA-1114-staging-signoff-evidence-package.md)
