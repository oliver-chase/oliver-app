# V.Two Campaign Content & Posting Module PRD

## Build-Ready Product Instruction Document for Codex in VS Code

**Document owner:** V.Two  
**Intended implementation context:** This is a reusable module to be added into V.Two internal applications.  
**Primary implementation audience:** Codex or another coding agent operating inside VS Code with access to the existing app, repository structure, component library, authentication system, database conventions, and integration patterns.  
**Document purpose:** This PRD defines the product behavior, user flows, required functionality, data model, automation requirements, permissions, reporting needs, and detailed user stories for a campaign content and posting system.

---

## 1. Product Summary

V.Two needs a reusable Campaign Content & Posting Module that allows the company to plan marketing campaigns, store content, manage content review, make approved content available for team members to self-claim, remind users to post, track what was posted, and report on campaign execution.

This is not a generic content library, social media scheduler, or spreadsheet replacement by itself. It is a structured execution layer for marketing campaigns. It should help V.Two move from campaign strategy to actual posting behavior with as little manual coordination as possible.

The module should support content for LinkedIn posts, company posts, blog posts, campaign assets, and future content types. It should prioritize LinkedIn and blog workflows first, but it must be built in a way that does not hardcode the product only to LinkedIn.

The core idea is simple: content enters the system as a draft, gets reviewed, becomes available to post, is claimed by a user for themselves, is posted externally, and is then logged and archived. The system must make this process easy enough that team members can participate without training and without having to maintain a spreadsheet.

---

## 2. Product Goals

The module must accomplish the following goals.

1. It must provide a structured content lifecycle so content can move from draft to review to approved availability to claimed posting to archived completion.
2. It must allow team members to self-claim content without allowing users to assign content to other people.
3. It must make posting actions extremely simple, with clear reminders and minimal clicks.
4. It must provide campaign-level visibility into what content exists, what has been approved, what has been claimed, what has been posted, and what remains open.
5. It must support a filterable content library that can handle company content, employee-attributed content, general content, campaign-specific content, thought leadership, offering-specific content, and blog content.
6. It must support reviewer workflows so draft content can be approved before becoming available to claim.
7. It must support reminders through downloadable ICS files in the MVP and should be designed for Slack and email reminders as follow-on or configurable integrations.
8. It must support lightweight reporting and export so V.Two can share campaign status through a dashboard export, PDF, or email summary.
9. It must avoid spreadsheet-style manual updates by using actions that update the appropriate fields automatically.
10. It must integrate into existing V.Two applications and follow the existing component library, routing patterns, permissions model, and design system.

---

## 3. Non-Goals for Version 1

The following functionality is explicitly out of scope for the first version unless the existing app already supports it in a straightforward way.

1. The module does not need to directly publish to LinkedIn, blogs, or other platforms in V1.
2. The module does not need to automatically retrieve full LinkedIn analytics for personal employee posts in V1.
3. The module does not need to support content reuse workflows in V1. Once content is posted, it should be archived and moved out of the active flow.
4. The module does not need to replace a full DAM system. It should store or link assets, but it does not need advanced asset rights management, image transformations, version rendering, or creative approval beyond the content review flow.
5. The module does not need a custom UI framework. It must adapt to the existing design system and components.
6. The module does not need complex AI content generation in V1. The chatbot may assist with guided flows if the existing app already has a chatbot framework, but the core module must work without relying on AI.

---

## 4. Core Product Principles

### 4.1 Self-Claiming Only

Users can claim content only for themselves. A standard user must not be able to assign a post to another person. This rule is important because the module is intended to encourage voluntary participation and avoid creating another management layer where someone manually assigns tasks.

Admins and reviewers may create content, approve content, and view reporting, but they should not claim content on behalf of someone else in the core V1 flow. If the existing app requires administrative override capabilities, those capabilities must be separate, clearly labeled, logged, and not part of the standard user path.

### 4.2 System-Managed State

Users should not manually change status fields. Status changes must occur only through clearly defined actions such as Save Draft, Submit for Review, Approve, Reject, Claim, Unclaim, Mark as Posted, or Archive.

### 4.3 Minimal Clicks

The most common actions must be fast.

Claiming approved content should require no more than two intentional actions after a user sees the content card. Marking content as posted should require no more than two intentional actions after a user opens the claimed content.

### 4.4 Default Values Should Reduce Work

If a user claims content, the posting date should default to today. The user should be able to override it, but the default should assume immediate action.

If a posting channel is needed, LinkedIn should be the default in V1. The system should still store channel as a flexible field so future channels can be added.

### 4.5 Clear Lifecycle, No Hidden Workflow

A user should always be able to understand what state a content item is in and what action is available next. The system must not allow content to be in multiple active states at once.

### 4.6 Action-Oriented UI

The UI should be designed around what the user wants to do, not around maintaining database fields. Users should see clear actions like Create Content, Submit for Review, Approve, Reject, Claim, Add to Calendar, Copy Content, Mark as Posted, and View Report.

---

## 5. User Roles and Permissions

### 5.1 Standard User / Contributor

A contributor can create draft content, submit their own draft content for review, browse approved unclaimed content, claim content for themselves, download an ICS reminder for their claimed content, copy content for posting, mark their claimed content as posted, and optionally add the external post URL.

A contributor cannot approve content, reject content, assign content to another user, claim content for another user, edit content after it has been approved unless the system intentionally sends it back to draft, or edit another user's content unless explicitly permitted by the existing app role model.

### 5.2 Reviewer

A reviewer can view content in Needs Review status, approve content, reject content with required feedback, edit submitted content before approval if that capability is enabled, and view review history. A reviewer also has contributor permissions unless the existing app separates these roles.

### 5.3 Admin

An admin can create and manage campaigns, manage reviewer assignment rules, view all content, view all activity logs, view reporting, export dashboard summaries, and configure campaign cadence or open posting slots. Admins may have override capabilities, but every override must be logged and should not be part of the normal contributor flow.

### 5.4 System / Automation Actor

The system can send reminders, generate ICS files, detect missed posts, update internal computed fields, and generate reports. System actions must be recorded where they affect visible state or reporting.

---

## 6. Content Lifecycle

### 6.1 Required States

Every content item must exist in exactly one of the following states.

1. **Draft**: The content has been created but is not ready for review or has been rejected and returned for edits.
2. **Needs Review**: The content has been submitted and is awaiting reviewer approval.
3. **Unclaimed**: The content has been approved and is available for a user to claim for posting.
4. **Claimed**: The content has been claimed by one user for a specific channel and scheduled posting date.
5. **Posted / Archived**: The content has been marked as posted and should leave the active posting workflow. It should remain visible in historical views and reports.

### 6.2 Valid State Transitions

The system must enforce the following transitions.

| Current State | Allowed Action | Resulting State |
|---|---|---|
| Draft | Save Draft | Draft |
| Draft | Submit for Review | Needs Review |
| Needs Review | Approve | Unclaimed |
| Needs Review | Reject | Draft |
| Unclaimed | Claim for Myself | Claimed |
| Claimed | Unclaim | Unclaimed |
| Claimed | Mark as Posted | Posted / Archived |
| Posted / Archived | No standard transition | Posted / Archived |

No other state transitions are allowed unless the implementation introduces an explicitly logged admin override with a clear reason.

### 6.3 Archived Content Behavior

Posted content should be archived automatically. Archived content should no longer appear in the default Available to Post view. It should remain searchable in historical reporting, campaign history, and activity views. Archived content should be read-only in the standard UI.

---

## 7. Required Navigation and Screens

Codex must inspect the existing application layout and component library before implementing these screens. The module should use the existing app's navigation conventions, table/card components, form components, modals, empty states, loading states, and notification patterns.

### 7.1 Campaign Dashboard

The dashboard is the default view for the module. It should summarize what needs attention and what is happening now.

It should include:

1. Content waiting for review.
2. Content available to claim.
3. Content claimed by the current user.
4. Posts scheduled for today.
5. Open posting slots for the current week.
6. Recent posted content.
7. Campaign-level activity summary.
8. Export/report action if the user has permission.

### 7.2 Campaigns List

The campaigns list should show all campaigns the user is allowed to view. Each campaign card or row should display campaign name, date range, status, number of draft items, number of items needing review, number of unclaimed approved items, number of claimed items, number of posted items, and next open posting slot if cadence is configured.

### 7.3 Campaign Detail

The campaign detail view should act as the working hub for a campaign. It should show strategy, content, schedule, activity, assets, and reporting.

It should include:

1. Campaign overview and strategy.
2. Target audience.
3. Key message or offer definition.
4. Keywords and SEO terms.
5. Content library filtered to that campaign.
6. Posting calendar or schedule view.
7. Activity timeline.
8. Reporting summary.
9. Export action.

### 7.4 Content Library

The content library is a searchable and filterable view of content items. The default view for normal users should prioritize Unclaimed content and the user's own Claimed content.

Filters should include content status, campaign, content type, topic, owner or attributed author, posting channel, date range, and whether an asset exists.

### 7.5 Content Detail

The content detail view should show all information needed to evaluate, claim, or post a content item depending on state and user permissions.

It should include title, body, topic, campaign, content type, assets, status, author or creator, reviewer information where relevant, claim information where relevant, scheduled date, post URL if posted, activity history, and available actions.

### 7.6 Review Queue

The review queue should be available to reviewers and admins. It should show content in Needs Review status, grouped or sorted by oldest waiting first by default. Reviewers should be able to open an item, review the content, optionally edit it if that capability is enabled, approve it, or reject it with feedback.

### 7.7 Posting Calendar

The posting calendar should show scheduled claimed posts, open slots, recently posted content, and missed items. It should support at least weekly and monthly views if the existing component library supports those patterns. If not, a list grouped by date is acceptable for MVP.

### 7.8 Reports and Exports

The reports view should support a date range, campaign filter, and export action. It should include activity metrics first and performance metrics second. The MVP should not depend on external analytics integrations to be useful.

---

## 8. Data Model Requirements

Codex must adapt these entities to the existing backend and database conventions. If the app already has users, roles, teams, organizations, files, comments, notifications, or audit logs, reuse existing patterns instead of creating duplicate systems.

### 8.1 Campaign

A campaign represents a marketing initiative or strategic content push.

Required fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID/string | Yes | Unique campaign identifier. |
| name | string | Yes | Human-readable campaign name. |
| description | text | No | General description. |
| offer_definition | text | No | Clear description of the offer or message. |
| target_audience | text | No | Who the campaign is intended to reach. |
| primary_cta | string | No | Main call to action. |
| keywords | array/string relation | No | SEO or messaging keywords. |
| start_date | date | No | Optional campaign start date. |
| end_date | date | No | Optional campaign end date. |
| cadence_rule | string/json | No | Optional posting cadence configuration. |
| status | enum | Yes | Draft, Active, Paused, Completed, Archived. |
| created_by | user reference | Yes | Creator. |
| created_at | datetime | Yes | Created timestamp. |
| updated_at | datetime | Yes | Updated timestamp. |

### 8.2 Content Item

A content item is a piece of content that can move through the lifecycle.

Required fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID/string | Yes | Unique content identifier. |
| title | string | Yes | Short title or hook. |
| body | text | Yes | Full content body or draft. |
| content_type | enum | Yes | LinkedIn post, blog, company post, graphic, email snippet, etc. |
| topic | string or relation | Yes | Topic classification. |
| campaign_id | nullable reference | No | Associated campaign. |
| status | enum | Yes | Draft, Needs Review, Unclaimed, Claimed, Posted. |
| intended_channel | enum/string | No | LinkedIn, blog, website, email, etc. |
| attributed_author_id | nullable user reference | No | Person the content is written for, if applicable. |
| posting_owner_id | nullable user reference | No | User who claimed it. This must only be set through self-claim except admin override. |
| reviewer_id | nullable user reference | No | Reviewer assigned or selected by rule. |
| scheduled_for | nullable datetime | No | Date/time user intends to post. |
| posted_at | nullable datetime | No | Date/time marked as posted. |
| post_url | nullable string | No | External URL after posting. |
| rejection_reason | nullable text | No | Required when rejected. |
| created_by | user reference | Yes | Creator. |
| created_at | datetime | Yes | Created timestamp. |
| updated_at | datetime | Yes | Updated timestamp. |
| archived_at | nullable datetime | No | Set when posted/archive terminal state occurs. |

### 8.3 Asset

Assets may be uploaded files or external links.

Required fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID/string | Yes | Unique asset identifier. |
| content_id | nullable reference | No | Optional content association. |
| campaign_id | nullable reference | No | Optional campaign association. |
| asset_type | enum | Yes | Image, Figma, Canva, Google Drive, PDF, blog draft, other. |
| url | string | Conditional | Required for external links. |
| file_reference | string | Conditional | Required for uploaded file. |
| title | string | No | Human-readable name. |
| created_by | user reference | Yes | Creator/uploader. |
| created_at | datetime | Yes | Created timestamp. |

### 8.4 Activity Log

Every meaningful action must be logged.

Required fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID/string | Yes | Unique log identifier. |
| entity_type | enum | Yes | Campaign, Content, Asset, Report, Reminder. |
| entity_id | string | Yes | Referenced entity. |
| action_type | enum/string | Yes | Created, submitted, approved, rejected, claimed, unclaimed, posted, exported, reminded, etc. |
| performed_by | nullable user/system reference | Yes | User or system actor. |
| timestamp | datetime | Yes | Action timestamp. |
| metadata | json | No | Relevant values before/after. |

### 8.5 Reminder

A reminder represents a planned or sent notification tied to posting.

Required fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID/string | Yes | Unique reminder identifier. |
| content_id | reference | Yes | Claimed content item. |
| user_id | reference | Yes | User who should receive reminder. |
| reminder_type | enum | Yes | ICS, Slack, Email, In-app. |
| scheduled_for | datetime | Yes | When reminder should occur. |
| sent_at | nullable datetime | No | When sent. |
| status | enum | Yes | Pending, Sent, Failed, Cancelled. |
| failure_reason | nullable text | No | Error context if failed. |

---

## 9. Detailed Functional Requirements

### 9.1 Campaign Creation and Management

Admins must be able to create and manage campaigns. A campaign does not need to be required for every content item, because some content may be general thought leadership or library content that is not campaign-specific.

The campaign form should include campaign name, description, offer definition, target audience, primary CTA, keywords, optional start date, optional end date, optional posting cadence, and campaign status.

The campaign detail page should show all associated content by lifecycle state. It should also show open slots if a cadence is configured.

### 9.2 Content Creation

Any contributor must be able to create content. The required fields must be title, body, content type, and topic. Campaign should be optional. Asset links should be optional.

A user must be able to save content as a draft without submitting it. A user must be able to submit a draft for review once required fields are completed.

### 9.3 Content Review

Reviewers must have a dedicated review queue. Reviewers must be able to approve or reject content. Rejection must require a written reason. Approval must move content to Unclaimed and make it available in the library.

If reviewer editing is enabled, edits must be logged. If the implementation does not support reviewer editing safely, reviewer editing should be deferred, and rejection with feedback should be used instead.

### 9.4 Claiming

Only Unclaimed content can be claimed. A user must claim content for themselves. The claim action must set posting owner, scheduled date, channel, and status.

The default posting date must be today. The default channel must be LinkedIn unless the content item has a predefined intended channel.

The system must prevent two users from claiming the same content at the same time through backend-level locking or transactional update logic.

### 9.5 Unclaiming

A user who claimed content must be able to release the claim if they can no longer post it. Releasing the claim returns the item to Unclaimed status, clears the posting owner, and cancels or marks related reminders as cancelled.

Admins may release a claim if needed, but this must be logged as an admin action.

### 9.6 Posting

A claimed content item should show a posting view with the full content body, copy-to-clipboard action, assets, posting guidance, scheduled date, and Mark as Posted action.

When a user marks content as posted, the system should ask for the external URL but should not require it in V1. If no URL is provided, the system should still allow the post to be marked as posted because not all posting workflows will have a URL immediately available.

After posting, the content becomes Posted/Archived and should no longer appear in active available or claimed views.

### 9.7 Reminders

In V1, the system must support ICS generation because V.Two users may be on Mac and PC and may use Outlook calendar. When a user claims content, the UI should offer an Add to Calendar or Download ICS action.

The ICS event should include the content title, scheduled date/time, a link back to the content detail page, and a short description telling the user to post the content.

If Slack integration exists or is added in the module, the system should send Slack reminders on the scheduled posting date. If email integration exists or is added, email can be a fallback.

### 9.8 Missed Posts

The system should detect when a content item remains Claimed after its scheduled date. Because the approved lifecycle states should remain simple, the system should not introduce a new user-facing status in V1. Instead, it should compute a missed flag from status and scheduled date.

A claimed item is missed if the status is Claimed and the scheduled date is before the current date/time beyond the configured grace period. The UI should display this as an alert or badge without changing the lifecycle status.

### 9.9 Reporting

The module must provide reporting that is useful even without external platform analytics.

The MVP dashboard should include content created, content approved, content claimed, content posted, posting frequency, posts by user, posts by campaign, posts by topic, missed posts, unclaimed approved content, and content waiting for review.

The system should support exporting a dashboard summary to PDF or email. If PDF export is not available in the current stack, implement email-ready HTML or markdown export first and clearly identify PDF as a follow-on technical task.

### 9.10 Performance Measurement

The system should support manual post URL capture in V1. If the user provides a post URL, it should be stored against the content item.

The system should be designed to later support manual metric entry or screenshot-based metric capture, but those do not have to be implemented in MVP unless the existing app already has OCR or AI extraction features.

The product should not promise automatic LinkedIn personal post analytics unless the team has confirmed the required API access and permissions.

---

## 10. Full User Story Map

Campaign story definitions were migrated from the PRD into the backlog workspace:
- `/.github/oliver-app/modules/campaigns-module/campaigns-module-user-story-map.md`

Use that file as the user-story source for execution mapping and backlog progress tracking.

## 11. Automation and Background Jobs

Codex must implement or stub the following jobs depending on the existing app infrastructure.

### 11.1 Daily Reminder Job

This job should identify content scheduled for posting today and send reminders to the posting owners through configured channels.

Required behavior:

1. It must only send reminders for content in Claimed status.
2. It must skip content that has already been posted.
3. It must skip or cancel reminders for content that has been unclaimed.
4. It must log successful and failed reminder attempts.
5. It must be idempotent so repeated runs do not spam users.

### 11.2 Missed Post Detection Job

This job should identify claimed content whose scheduled date has passed and surface missed execution.

Required behavior:

1. It must compute missed status from scheduled date and lifecycle status.
2. It must not create a new lifecycle state in V1.
3. It must notify the posting owner if configured.
4. It must make missed items visible in the dashboard and reporting.
5. It must log detection or notification actions where practical.

### 11.3 Report Export Job

If report generation is asynchronous, the export job should generate the requested report and notify or return the file to the user.

Required behavior:

1. It must respect user permissions.
2. It must include selected filters.
3. It must log export generation.
4. It must fail gracefully and show the user a clear message if export generation fails.

---

## 12. Integration Requirements

### 12.1 Calendar / ICS

The system must generate ICS files for claimed content. The ICS approach is the required V1 calendar integration because it works across Outlook, Apple Calendar, and other calendar tools without requiring full calendar API permissions.

### 12.2 Slack

Slack reminders and review notifications are preferred if Slack integration exists or can be added cleanly. Slack must be treated as an optional channel, not as a hard dependency for core product functionality.

### 12.3 Email

Email may be used for review notifications, posting reminders, and export summaries if the existing system supports email sending.

### 12.4 LinkedIn

The system must not depend on automatic LinkedIn analytics for V1. The system should store LinkedIn post URLs when users provide them. Any future LinkedIn integration must be scoped separately and must distinguish company page analytics from personal employee post analytics.

### 12.5 File Storage

The system should use existing app file storage if available. If file storage is not available, V1 should support external asset links and defer uploads.

---

## 13. Reporting Metrics Definitions

The following metrics must be calculated consistently.

### 13.1 Content Created

Count of content items created during the selected date range based on created_at.

### 13.2 Content Submitted for Review

Count of content items that entered Needs Review during the selected date range based on activity log events.

### 13.3 Content Approved

Count of content items approved during the selected date range based on activity log events.

### 13.4 Content Claimed

Count of content items claimed during the selected date range based on activity log events.

### 13.5 Content Posted

Count of content items marked as posted during the selected date range based on posted_at or posted activity events.

### 13.6 Missed Posts

Count of content items in Claimed status where scheduled_for is before the current date/time beyond the configured grace period.

### 13.7 Posts by User

Count of posted content grouped by posting_owner_id for the selected date range.

### 13.8 Posts by Campaign

Count of posted content grouped by campaign_id for the selected date range.

### 13.9 Posts by Topic

Count of posted content grouped by topic for the selected date range.

### 13.10 Unclaimed Approved Content

Count of content items currently in Unclaimed status.

### 13.11 Content Waiting for Review

Count of content items currently in Needs Review status.

---

## 14. Required Edge Cases

Codex must explicitly handle the following edge cases.

1. A user opens a content item that was just claimed by someone else.
2. Two users attempt to claim the same content at nearly the same time.
3. A reviewer attempts to approve content that was already rejected by another reviewer.
4. A user tries to mark content as posted after it has already been posted.
5. A user tries to edit content after it has been approved.
6. A claimed post becomes overdue.
7. A user releases a claim after a reminder was already scheduled.
8. An admin changes campaign cadence after posts have already been scheduled.
9. A content item has an invalid or inaccessible asset link.
10. A report export fails.
11. A Slack or email notification fails.
12. A user without permission attempts to access reporting.
13. A user without reviewer permission attempts to approve or reject content.
14. A campaign is archived while content is still active.
15. A content item is created without a campaign.
16. A post URL is added after content has already been archived.
17. A user's timezone differs from the campaign owner's timezone.
18. A content item has an attributed author that is different from the posting owner.

---

## 15. Prioritization

### Phase 1: Core MVP

Phase 1 must include the minimum complete workflow.

Required:

1. Campaign list and campaign detail basics.
2. Content draft creation.
3. Submit for review.
4. Review queue.
5. Approve and reject.
6. Content library with filtering.
7. Self-claiming.
8. Unclaiming.
9. Posting view with copy action.
10. Mark as posted.
11. Activity log for state-changing actions.
12. ICS generation.
13. Basic dashboard counts.
14. Backend state validation.

### Phase 2: Execution Visibility and Notifications

Required:

1. Posting calendar or date-grouped schedule.
2. Campaign cadence and open slots.
3. Daily reminder job.
4. Missed post detection.
5. Slack and/or email notifications.
6. More robust reporting filters.
7. Export to email-ready HTML or markdown.

### Phase 3: Reporting, Performance, and Assistant Paths

Required:

1. PDF export if technically feasible.
2. Manual performance metric entry.
3. Chatbot-guided claim flow.
4. Chatbot-guided content creation flow.
5. Chatbot campaign status summary.
6. Future analytics integration planning.

---

## 16. Codex Implementation Instructions

Codex must use this PRD as the source of truth and must inspect the existing application before implementing.

Before writing code, Codex must identify:

1. Existing authentication and user role patterns.
2. Existing database ORM or schema conventions.
3. Existing routing patterns.
4. Existing design system components.
5. Existing notification infrastructure.
6. Existing file upload or asset handling infrastructure.
7. Existing background job infrastructure.
8. Existing export/reporting utilities.
9. Existing test framework.

Codex must not create duplicate systems if the application already has usable infrastructure.

Codex must create an implementation plan that maps this PRD to:

1. Database/schema changes.
2. API endpoints or server actions.
3. UI pages and components.
4. State transition logic.
5. Background jobs.
6. Notification handlers.
7. Export utilities.
8. Tests.

If Codex finds a missing requirement, it must add it as a gap-filled implementation note before coding.

---

## 17. Suggested API or Server Action Contracts

Codex should adapt these to the existing architecture.

### Campaigns

1. `createCampaign(payload)` creates a campaign.
2. `updateCampaign(campaignId, payload)` updates a campaign.
3. `listCampaigns(filters)` returns campaigns visible to the user.
4. `getCampaign(campaignId)` returns campaign detail and related summary data.
5. `archiveCampaign(campaignId)` archives a campaign if allowed.

### Content

1. `createContentDraft(payload)` creates a Draft content item.
2. `updateContentDraft(contentId, payload)` edits a Draft content item.
3. `submitContentForReview(contentId)` moves Draft to Needs Review.
4. `approveContent(contentId)` moves Needs Review to Unclaimed.
5. `rejectContent(contentId, reason)` moves Needs Review to Draft.
6. `claimContent(contentId, payload)` moves Unclaimed to Claimed for the current user.
7. `unclaimContent(contentId)` moves Claimed to Unclaimed for the claiming user or authorized admin.
8. `updateScheduledDate(contentId, scheduledFor)` updates schedule for a claimed item.
9. `markContentPosted(contentId, payload)` moves Claimed to Posted.
10. `updatePostUrl(contentId, postUrl)` updates URL on Posted content.
11. `listContent(filters)` returns content visible to the user.
12. `getContent(contentId)` returns content detail.

### Reminders

1. `generateIcsForContent(contentId)` returns an ICS file for claimed content.
2. `sendPostingReminders()` sends scheduled reminders.
3. `detectMissedPosts()` computes/surfaces missed posts.

### Reporting

1. `getCampaignReport(filters)` returns dashboard/report data.
2. `exportCampaignReport(filters, format)` exports the report.

---

## 18. Definition of Done

The module is complete for MVP when the following conditions are met.

1. A contributor can create a draft, submit it for review, and see its review status.
2. A reviewer can approve or reject submitted content with required feedback on rejection.
3. Approved content appears in an Available to Post view.
4. A user can claim approved content only for themselves.
5. The system prevents duplicate claims through backend validation.
6. A user can download an ICS reminder for claimed content.
7. A user can open claimed content, copy it, access assets, and mark it as posted.
8. Posted content is archived and removed from active posting views.
9. The dashboard shows basic campaign/content activity metrics.
10. State transitions are enforced by the backend.
11. All state-changing actions are logged.
12. The UI uses existing design system components.
13. The system handles loading states, error states, empty states, and permission states clearly.
14. The module can be added into existing V.Two apps without requiring a separate standalone application.

---

## 19. Final Product Direction

Build this as a structured, reusable marketing execution module. Do not build it as a flexible spreadsheet. Do not build it as a general-purpose project management tool. Do not build it as a social scheduler.

The product should make it easy for a V.Two team member to answer three questions:

1. What content is ready for me to post?
2. What have I committed to post?
3. What has already happened across the campaign?

The admin or stakeholder should be able to answer four additional questions:

1. What content is waiting for review?
2. What posting slots are unclaimed?
3. What content has been posted?
4. What can I export as a status update?

If the implementation makes those answers harder to find, the implementation is wrong and should be simplified.
