# User Story Map

Source: `campaigns-module-prd.md`

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

## Epic 9: Reminders and Notifications

### Story 9.1: Generate ICS Calendar Reminder

As a user who claimed content, I want to download an ICS calendar reminder so that I can add a reminder to Outlook, Apple Calendar, or another calendar tool.

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
3. Manual metric updates must be timestamped.
4. Manual metric updates must be logged.
5. Reporting must clearly distinguish manually entered metrics from automatically imported metrics.

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
