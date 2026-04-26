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

The following stories are written as build-ready product stories. Codex must implement these stories or identify explicitly why a story cannot be implemented in the current codebase. If the current app has no matching infrastructure, Codex must create a technical task or implementation note.

---

## Epic 1: Module Access and Navigation

### Story 1.1: Access the Campaign Content Module

As a V.Two user, I want to access the Campaign Content & Posting Module from the existing application navigation so that I can create, find, claim, and track marketing content without leaving the internal app.

#### Acceptance Criteria

1. The module must be reachable from the existing application navigation using the app's established navigation pattern.
2. The navigation label must clearly indicate that the area is for campaigns, content, or marketing execution.
3. When a user opens the module, the system must show a dashboard view rather than dropping the user into a raw table.
4. If the user does not have permission to access the module, the system must show a clear permission message and must not expose campaign or content data.
5. The route structure must follow the existing app's routing conventions.

### Story 1.2: Show a Role-Appropriate Dashboard

As a user, I want the default dashboard to show the actions most relevant to my role so that I can quickly understand what I need to do.

#### Acceptance Criteria

1. A contributor must see content available to claim, content they have claimed, and content they have drafted.
2. A reviewer must additionally see content waiting for review.
3. An admin must additionally see campaign-level status, reporting summaries, and export options.
4. The dashboard must not show actions that the current user is not allowed to take.
5. The dashboard must use existing card, list, table, badge, button, and empty-state components from the application.

---

## Epic 2: Campaign Management

### Story 2.1: Create a Campaign

As an admin, I want to create a marketing campaign so that content can be organized around a specific strategy, audience, offer, and timeframe.

#### Acceptance Criteria

1. The system must provide a Create Campaign action for admins.
2. The campaign form must require a campaign name.
3. The campaign form must allow the admin to enter a description, offer definition, target audience, primary CTA, keywords, start date, end date, and cadence rule.
4. The system must save the campaign with Active, Draft, Paused, Completed, or Archived status.
5. The system must validate that the end date is not earlier than the start date when both dates are provided.
6. The system must log the campaign creation event.
7. After successful creation, the user must be taken to the campaign detail view or shown a clear success state with a link to the campaign.

### Story 2.2: Edit a Campaign

As an admin, I want to edit campaign details so that the campaign strategy and execution settings stay accurate over time.

#### Acceptance Criteria

1. Admins must be able to edit campaign fields after creation.
2. The system must preserve all existing content relationships when campaign details are edited.
3. The system must log the edit event with the updated fields in activity metadata where practical.
4. If a campaign cadence is changed, the system must recalculate open posting slots for future dates only.
5. Editing a campaign must not alter content lifecycle states.

### Story 2.3: View Campaign Detail

As a user, I want to view a campaign detail page so that I can understand the campaign strategy, available content, schedule, and status in one place.

#### Acceptance Criteria

1. The campaign detail page must show campaign name, description, offer definition, audience, CTA, keywords, date range, and status.
2. The campaign detail page must show content grouped by Draft, Needs Review, Unclaimed, Claimed, and Posted.
3. The campaign detail page must show upcoming claimed posts and recent posted content.
4. The campaign detail page must show open posting slots if cadence is configured.
5. The campaign detail page must include an activity timeline or activity section if the app has an activity pattern.
6. The campaign detail page must include reporting summary metrics for users with reporting permission.

---

## Epic 3: Content Creation and Drafting

### Story 3.1: Create a Content Draft

As a contributor, I want to create a content draft so that I can add marketing content into the system before it is reviewed or posted.

#### Acceptance Criteria

1. The user must be able to start a new content item from the module dashboard, content library, or campaign detail page.
2. The content creation form must include title, body, content type, topic, optional campaign, optional intended channel, optional attributed author, and optional assets.
3. Title, body, content type, and topic must be required before the item can be submitted for review.
4. The user must be able to save incomplete content as Draft if the minimum draft-save requirements are met. At minimum, either title or body must be present so the draft can be identified later.
5. The system must set the content creator to the current authenticated user.
6. The system must set the initial status to Draft.
7. The system must log content creation.
8. The system must show a success message after the draft is saved.

### Story 3.2: Edit My Draft

As a contributor, I want to edit my own draft so that I can improve content before submitting it for review.

#### Acceptance Criteria

1. A contributor must be able to edit content they created while it is in Draft status.
2. The system must update the updated_at timestamp after a successful edit.
3. The system must not allow a contributor to edit a content item once it has moved to Needs Review, Unclaimed, Claimed, or Posted unless the item is returned to Draft.
4. The system must log material edits if an activity log pattern exists for edits.
5. The user must receive clear feedback when edits are saved.

### Story 3.3: Attach or Link Assets to Content

As a contributor, I want to attach or link assets to a content item so that the person posting has access to graphics, files, or external creative materials.

#### Acceptance Criteria

1. The content form must allow users to add at least one asset link or uploaded asset if the existing app supports uploads.
2. Asset types must include external link, image, document, Figma, Canva, Google Drive, or other.
3. Asset links must be valid URLs when the asset type is external link.
4. Assets must be visible on the content detail page.
5. Assets must be available in the posting view after the content is claimed.
6. Adding or removing an asset must not change the content lifecycle state.

---

## Epic 4: Review and Approval

### Story 4.1: Submit a Draft for Review

As a contributor, I want to submit my draft for review so that a reviewer can approve it before it becomes available for posting.

#### Acceptance Criteria

1. The Submit for Review action must only be available when the content item is in Draft status.
2. The system must validate that title, body, content type, and topic are present before submission.
3. When submission succeeds, the system must change the status from Draft to Needs Review.
4. The system must assign a reviewer using the configured reviewer assignment rule. If no specific rule exists, the item may go into a shared reviewer queue.
5. The system must notify the reviewer or reviewer group.
6. The system must log the submission event.
7. The contributor must see a confirmation that the content was submitted for review.

### Story 4.2: View Review Queue

As a reviewer, I want to view content waiting for review so that I can approve or reject submitted content.

#### Acceptance Criteria

1. Reviewers must have access to a Review Queue view.
2. The Review Queue must show only content in Needs Review status unless filters are applied.
3. Each queue item must show title, content type, topic, campaign if applicable, creator, submitted date, and review action.
4. The default sort must prioritize the oldest submitted content first so content does not sit unreviewed.
5. If no content needs review, the system must show a clear empty state.

### Story 4.3: Approve Content

As a reviewer, I want to approve submitted content so that it becomes available for someone to claim and post.

#### Acceptance Criteria

1. The Approve action must only be available to users with reviewer or admin permission.
2. The Approve action must only be available when the content is in Needs Review status.
3. When approved, the system must change the content status to Unclaimed.
4. Approved content must immediately appear in the Available to Post view.
5. The system must log the approval action with reviewer identity and timestamp.
6. The system must notify the creator that the content was approved if notifications are enabled.
7. The system must not automatically assign the content to any user after approval.

### Story 4.4: Reject Content with Feedback

As a reviewer, I want to reject content with a written reason so that the creator understands what needs to be fixed.

#### Acceptance Criteria

1. The Reject action must only be available to users with reviewer or admin permission.
2. The Reject action must only be available when the content is in Needs Review status.
3. The reviewer must be required to enter a rejection reason before the rejection can be submitted.
4. When rejected, the system must change the content status back to Draft.
5. The rejection reason must be stored and displayed to the original creator on the content detail page.
6. The system must notify the creator that the content was rejected.
7. The system must log the rejection action with reviewer identity, timestamp, and rejection reason metadata.

### Story 4.5: Prevent Conflicting Reviews

As a reviewer, I want the system to prevent conflicting review actions so that two reviewers do not approve or reject the same item at the same time.

#### Acceptance Criteria

1. If two reviewers open the same item, the system must prevent conflicting final actions through backend validation.
2. If one reviewer approves the item, a second reviewer attempting to reject it afterward must receive a clear message that the item has already been reviewed.
3. If one reviewer rejects the item, a second reviewer attempting to approve it afterward must receive a clear message that the item has already been reviewed.
4. The UI must refresh or update state after a conflicting action is detected.
5. The system must log only the successful review decision as the state-changing action.

---

## Epic 5: Content Library and Discovery

### Story 5.1: Browse Available Content

As a user, I want to browse approved unclaimed content so that I can quickly find something appropriate to post.

#### Acceptance Criteria

1. The default contributor library view must prioritize Unclaimed content and the current user's Claimed content.
2. Unclaimed content must be clearly labeled as available to claim.
3. Claimed content must show who claimed it if the viewer has permission to see that information.
4. Posted content must not appear in the default available view.
5. The library must have an empty state explaining what it means when no content is available.

### Story 5.2: Filter the Content Library

As a user, I want to filter the content library so that I can find content by campaign, topic, content type, status, or channel.

#### Acceptance Criteria

1. The library must include filters for campaign, topic, content type, status, and intended channel.
2. The library should include filters for attributed author and asset availability if those fields exist in the implementation.
3. Applying a filter must update the list without requiring a full page reload unless the existing app architecture requires it.
4. The active filters must be visible to the user.
5. The user must be able to clear filters.

### Story 5.3: Search Content

As a user, I want to search content by title, body, topic, and campaign so that I can locate relevant material quickly.

#### Acceptance Criteria

1. The library must include a search input.
2. Search must match at least title and body.
3. Search should also match topic and campaign name if supported by the data model.
4. Search results must respect user permissions.
5. If no results match, the system must show a clear no-results state.

### Story 5.4: View Content Card Summary

As a user, I want each content item to show enough context that I can decide whether to open or claim it.

#### Acceptance Criteria

1. Each content card or row must show title, content type, topic, campaign if present, status, and a short preview.
2. An Unclaimed item must show a Claim action.
3. A Claimed item must show the scheduled date and claiming user if visible to the current user.
4. A Posted item must show posted date and post URL if present in historical views.
5. The card or row must use existing component library patterns.

---

## Epic 6: Claiming and Scheduling

### Story 6.1: Claim Content for Myself

As a user, I want to claim approved content for myself so that I can take responsibility for posting it.

#### Acceptance Criteria

1. The Claim action must only be available for content in Unclaimed status.
2. The Claim action must always assign the current authenticated user as the posting owner.
3. The standard user interface must not allow a user to claim content for another person.
4. When the user clicks Claim, the system must ask for posting channel and posting date unless defaults can be applied immediately with a confirmation.
5. The posting channel must default to LinkedIn unless the content item has another intended channel.
6. The posting date must default to today's date in the user's local timezone.
7. When the claim is confirmed, the system must set posting owner, scheduled date, channel, and Claimed status.
8. The system must log the claim action.
9. The system must show a success message and offer the user a calendar reminder action.

### Story 6.2: Prevent Duplicate Claims

As a system, I need to prevent two users from claiming the same content item so that ownership remains clear and reliable.

#### Acceptance Criteria

1. Claiming must be enforced by backend validation, not only UI disabling.
2. If two users try to claim the same content at the same time, only the first successful transaction may update the content.
3. The second user must receive a clear message that the content was already claimed.
4. The library view must update to reflect the new Claimed state.
5. The system must not create duplicate reminder records for failed claims.

### Story 6.3: Change My Scheduled Posting Date

As a user who claimed content, I want to change my scheduled posting date so that I can adjust when I plan to post.

#### Acceptance Criteria

1. A user may change the scheduled date only for content they have personally claimed.
2. Reviewers and admins may change scheduled dates only if the app intentionally supports administrative override.
3. Changing the scheduled date must update or regenerate any pending reminder records.
4. Changing the scheduled date must be logged.
5. The system must show the updated scheduled date on the content detail page, calendar, and dashboard.

### Story 6.4: Release My Claim

As a user who claimed content, I want to release my claim so that someone else can claim it if I can no longer post it.

#### Acceptance Criteria

1. A user may release a claim only for content they personally claimed.
2. Releasing the claim must clear posting owner and scheduled date unless the product team decides to preserve the date as a suggested slot.
3. Releasing the claim must return the content status to Unclaimed.
4. Releasing the claim must cancel pending reminders tied to the prior claim.
5. Releasing the claim must be logged.
6. The content must return to the Available to Post view immediately.

---

## Epic 7: Posting Execution

### Story 7.1: Open My Claimed Content for Posting

As a user who claimed content, I want to open a posting-ready view so that I can copy the content and access any assets with minimal friction.

#### Acceptance Criteria

1. The user's dashboard must show content they have claimed.
2. The content detail page for claimed content must show the full post body prominently.
3. The page must include a copy-to-clipboard action for the body.
4. The page must show linked or uploaded assets.
5. The page must show the scheduled date and channel.
6. The page must include a Mark as Posted action.

### Story 7.2: Mark My Claimed Content as Posted

As a user who posted content externally, I want to mark it as posted so that the system records completion and removes it from active workflow.

#### Acceptance Criteria

1. The Mark as Posted action must only be available to the user who claimed the content, unless admin override is intentionally supported.
2. The action must only be available when the content is in Claimed status.
3. The system must ask for an optional post URL.
4. The system must allow the user to mark content as posted even if no URL is provided.
5. When submitted, the system must set posted_at to the current timestamp.
6. When submitted, the system must change the status to Posted.
7. When submitted, the system must set archived_at to the current timestamp.
8. The system must log the posted action.
9. The system must prevent the same content from being marked as posted more than once.
10. The content must no longer appear in active Available to Post or My Claimed views after posting.

### Story 7.3: Add or Correct a Post URL After Posting

As a user, I want to add or correct the external post URL after marking content as posted so that the historical record can be accurate.

#### Acceptance Criteria

1. The system must allow the posting owner to add a missing post URL after posting.
2. The system must allow the posting owner to correct a post URL after posting if the content is in Posted status.
3. The system must validate that the post URL is a valid URL format.
4. Updating the post URL must not change the lifecycle status.
5. Updating the post URL must be logged.

---

## Epic 8: Calendar, Open Slots, and Cadence

### Story 8.1: Configure Campaign Posting Cadence

As an admin, I want to define a posting cadence for a campaign so that the system can show which days need content coverage.

#### Acceptance Criteria

1. The campaign form must allow an optional cadence rule.
2. The cadence rule must support at least simple frequency settings such as every weekday, every other day, weekly, or custom selected days if practical within the existing app.
3. The system must use the cadence rule to compute open posting slots for the campaign date range.
4. Changing the cadence rule must affect future open slots only and must not alter already posted content.
5. The cadence rule must be visible on the campaign detail page.

### Story 8.2: View Open Posting Slots

As a user, I want to see which posting days are open so that I can claim content for a day that needs coverage.

#### Acceptance Criteria

1. The campaign detail page must show open posting slots when a campaign has a cadence rule.
2. The dashboard must highlight open slots for the current week when relevant.
3. A claimed post scheduled for a slot must make that slot appear filled.
4. A posted item must appear as completed historical activity for that slot.
5. Open slots must be visually distinct from claimed and posted slots.

### Story 8.3: View Posting Calendar

As a user, I want to see a calendar or date-grouped schedule so that I can understand what is planned, what is open, and what was recently posted.

#### Acceptance Criteria

1. The calendar or schedule view must show claimed content by scheduled date.
2. The calendar or schedule view must show posted content by posted date or scheduled date, depending on the reporting context.
3. The calendar or schedule view must show open slots when cadence is configured.
4. The view must allow filtering by campaign.
5. The view must show missed claimed posts as needing attention.

---

## Epic 9: Reminders and Notifications

### Story 9.1: Generate ICS Calendar Reminder

As a user who claimed content, I want to download an ICS calendar event so that I can add a reminder to Outlook, Apple Calendar, or another calendar tool.

#### Acceptance Criteria

1. After a successful claim, the UI must offer an Add to Calendar or Download ICS action.
2. The ICS event must include the content title in the event title.
3. The ICS event must use the scheduled posting date and a default posting time if no time was selected.
4. The ICS event description must include a link back to the content detail page.
5. The ICS event description must include simple instructions to post the content and mark it as posted.
6. The ICS file must be compatible with Outlook on Mac and PC as much as practical.
7. Generating the ICS file must not alter content state.

### Story 9.2: Send Review Notifications

As a reviewer, I want to be notified when content needs review so that drafts do not sit unnoticed.

#### Acceptance Criteria

1. When content enters Needs Review status, the system must create or send a reviewer notification.
2. The notification must include content title, creator, campaign if present, and a link to review.
3. The notification must use the existing app notification system if one exists.
4. If Slack is available, Slack should be supported as a notification channel.
5. If email is available, email may be used as a fallback.
6. Notification delivery failures must be logged.

### Story 9.3: Send Posting Reminders

As a user who claimed content, I want to receive a reminder on the scheduled posting date so that I remember to post.

#### Acceptance Criteria

1. The system must create a reminder record when content is claimed.
2. The reminder must be scheduled for the content's scheduled posting date and default posting time.
3. If Slack integration is available, the reminder must include content title, campaign, scheduled channel, and link to the content detail page.
4. If email fallback is enabled, the email must contain the same information.
5. Reminder send attempts must be logged.
6. If the content is unclaimed before the scheduled time, the reminder must be cancelled.
7. If the content is marked as posted before the scheduled time, the reminder must be cancelled or skipped.

### Story 9.4: Detect and Surface Missed Posts

As an admin or campaign stakeholder, I want missed posts to be visible so that campaign execution gaps do not go unnoticed.

#### Acceptance Criteria

1. The system must compute a missed indicator for Claimed content whose scheduled date has passed without being marked as posted.
2. The missed indicator must be visible on the dashboard, content detail page, and calendar/schedule view.
3. The missed indicator must not create a new lifecycle status in V1.
4. The system must notify the posting owner when a claimed post becomes missed if notifications are enabled.
5. Missed posts must be included in reporting metrics.

---

## Epic 10: Reporting and Export

### Story 10.1: View Campaign Activity Dashboard

As a stakeholder, I want to view campaign activity metrics so that I can understand whether the team is executing against the campaign plan.

#### Acceptance Criteria

1. The dashboard must show the number of content items created during the selected date range.
2. The dashboard must show the number of items submitted for review, approved, claimed, posted, and missed.
3. The dashboard must show posts by campaign.
4. The dashboard must show posts by topic.
5. The dashboard must show posts by user where permissions allow.
6. The dashboard must show content waiting for review.
7. The dashboard must show approved unclaimed content.
8. The dashboard must work without external social analytics data.

### Story 10.2: Filter Reports by Date Range and Campaign

As a stakeholder, I want to filter reports by date range and campaign so that I can produce relevant status updates.

#### Acceptance Criteria

1. Reports must support at least Last 7 Days, Last 30 Days, Current Month, and Custom Range.
2. Reports must support filtering by campaign.
3. Reports must support filtering by content type if practical within the data model.
4. Report metrics must recalculate when filters change.
5. The selected filters must be shown clearly in the report view and export output.

### Story 10.3: Export a Campaign Status Summary

As a stakeholder, I want to export a campaign status summary so that I can share progress without manually rewriting dashboard data.

#### Acceptance Criteria

1. The report view must provide an export action for users with reporting permission.
2. The export must include campaign name, date range, activity metrics, content lifecycle summary, missed post summary, and recent posted content.
3. The export should support PDF if the application already has PDF generation or if PDF generation can be implemented safely within the stack.
4. If PDF is not practical in the current stack, the system must support an email-ready HTML or markdown export as the MVP fallback.
5. Export generation must be logged.
6. The exported summary must not expose content or user data to unauthorized users.

### Story 10.4: Store Manual Performance Data

As a stakeholder, I want to optionally store basic performance data against posted content so that we can compare content performance even before full analytics integrations exist.

#### Acceptance Criteria

1. The system must allow manual entry of basic performance metrics for posted content if the product team enables this field set.
2. Manual metrics may include impressions, clicks, likes, comments, reposts, and notes.
3. Manual metrics must be associated with the posted content item and timestamped.
4. Manual metric updates must be logged.
5. Reporting must clearly distinguish manually entered metrics from automatically imported metrics.

---

## Epic 11: Chatbot-Assisted Paths

### Story 11.1: Start a Guided Claim Flow from Chat

As a user, I want to use the chatbot to find and claim content so that I can complete the workflow without manually filtering the library.

#### Acceptance Criteria

1. The chatbot must support a guided path for claiming content if the existing app has chatbot routing.
2. The chatbot must ask the user what type of content or topic they want if no context is provided.
3. The chatbot must return only content that is Unclaimed and visible to the current user.
4. The chatbot must allow the user to select one content item to claim.
5. The chatbot must apply the same backend claim rules as the standard UI.
6. The chatbot must not allow the user to claim content for another person.
7. If no content is available, the chatbot must explain that no matching content is currently available.

### Story 11.2: Start a Guided Content Creation Flow from Chat

As a contributor, I want to use the chatbot to create a draft so that I can add content quickly without navigating through the full form first.

#### Acceptance Criteria

1. The chatbot must collect enough information to create a Draft content item.
2. The chatbot must ask for title or hook, body, content type, and topic.
3. The chatbot may ask for campaign and asset links if relevant.
4. The chatbot must create the content item in Draft status.
5. The chatbot must not submit the content for review unless the user explicitly asks to submit it.
6. The chatbot-created draft must appear in the standard content library and detail views.

### Story 11.3: Start a Guided Status Summary from Chat

As an admin or stakeholder, I want to ask the chatbot for a campaign status summary so that I can quickly understand progress.

#### Acceptance Criteria

1. The chatbot must respect reporting permissions before returning status data.
2. The chatbot must ask which campaign or date range to summarize if the request is ambiguous.
3. The chatbot response must include content created, approved, claimed, posted, missed, and unclaimed counts when available.
4. The chatbot must provide links back to the relevant campaign or report view.
5. The chatbot must not fabricate performance metrics that are not present in the system.

---

## Epic 12: Auditability, Validation, and Error Handling

### Story 12.1: Log Every State-Changing Action

As an admin, I want every state-changing action to be logged so that the team can audit what happened and resolve confusion.

#### Acceptance Criteria

1. The system must log content creation, submission, approval, rejection, claim, unclaim, scheduled date change, post completion, URL update, reminder send, missed post detection, and export generation.
2. Each log entry must include entity, action type, actor, timestamp, and relevant metadata.
3. Activity logs must be visible to admins.
4. Activity logs should be visible in limited form on content detail pages when useful.
5. Logs must not expose sensitive information to unauthorized users.

### Story 12.2: Validate State Transitions on the Backend

As a system, I need to validate state transitions on the backend so that invalid UI behavior or direct API calls cannot corrupt content state.

#### Acceptance Criteria

1. The backend must reject invalid lifecycle transitions.
2. The backend must return clear error messages for invalid transitions.
3. The UI must display understandable error messages when a transition fails.
4. The backend must not rely only on disabled UI buttons for data integrity.
5. Automated tests should cover valid and invalid transitions if the codebase has a test framework.

### Story 12.3: Show Clear Loading and Error States

As a user, I want the system to clearly show when actions are processing or have failed so that I do not accidentally duplicate actions.

#### Acceptance Criteria

1. Buttons that trigger state changes must show a loading or disabled state while the action is processing.
2. The UI must prevent duplicate submissions during processing.
3. Failed actions must show clear error messages.
4. Successful actions must show clear confirmation messages.
5. The UI must recover gracefully if the data has changed since the page loaded.

---

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
