# V.Two Self-Led Growth & Review System — Product Instruction Document

## 1. Product Vision

V.Two needs an internal, self-led growth and review system that helps employees continuously capture goals, actions, feedback, examples, and progress throughout the year without creating a heavy administrative burden for either the employee or the reviewers.

The system should replace the pattern where review season produces multiple scattered documents, inconsistent notes, forgotten feedback, and rushed reviewer prep. Instead, employees should have a simple, ongoing place to document their growth against clear company-defined focus areas. Reviewers should have a consolidated, easy-to-scan view that summarizes the right information at the right time without forcing them to read hundreds of raw updates per person.

This is not intended to be a rigid HR performance management system. It should feel lightweight, useful, self-directed, and practical for a growing company that does not yet have a fully formalized management structure. It should also be designed so that management assignments, review ownership, permissions, and structured review cycles can become more formal over time without requiring a rebuild.

The experience should support V.Two’s culture: high ownership, strong client delivery, craftsmanship, continuous improvement, and meaningful contribution beyond assigned tasks.

## 2. Core Product Principles

The system should be built around the following principles:

1. **Lowest possible lift for employees.** Employees should be able to add meaningful updates quickly, with guided prompts, examples, buttons, and lightweight forms instead of long open-ended documents.

2. **Lowest possible lift for reviewers.** Reviewers should not have to read five separate documents, hunt through Slack, or manually synthesize hundreds of notes. The system should produce a clean review packet and dashboard for each person.

3. **Self-led by default.** Employees own their goals, evidence, reflections, and progress. The system should prompt and guide them, but not require constant manager intervention.

4. **Structured enough to be useful, flexible enough to be real.** The system should define focus areas, goal paths, and review cycles, but employees should still be able to add context, examples, and updates in their own words.

5. **Continuous capture, periodic synthesis.** Employees should be able to add actions, wins, lessons, feedback, and examples anytime. Quarterly and annual review moments should summarize and organize what has already been captured.

6. **Company-level consistency.** Definitions like quality, craftsmanship, client focus, and legacy should be visible and consistent across the company, while allowing different employee levels or role paths to emphasize different behaviors.

7. **Future-ready permissions and review ownership.** The system should work before V.Two has a formal management hierarchy, but it should support assigning reviewers, managers, admins, and management groups later.

## 3. Intended Users

### 3.1 Employee

An employee uses the system to:

- View their assigned goal path or focus areas.
- Create and update goals.
- Add actions, examples, work evidence, links, notes, and feedback throughout the year.
- Request feedback from colleagues.
- Respond to quarterly prompts.
- Complete an annual self-review.
- See their progress and reflection history in one place.

### 3.2 Reviewer

A reviewer uses the system to:

- View assigned employees.
- See a consolidated review packet for each employee.
- Review goals, progress, examples, quarterly updates, feedback, and annual reflections.
- Add reviewer notes, assessment, follow-up questions, and review outcomes.
- Avoid manually sorting through excessive raw inputs.

### 3.3 Admin

An admin uses the system to:

- Manage employees and permissions.
- Assign employees to goal paths.
- Define focus areas and their descriptions.
- Manage level-specific expectations and examples.
- Assign reviewers or reviewer groups.
- Configure quarterly and annual review prompts.
- Monitor completion status and review workload.

### 3.4 Management Group Member

A management group member may be assigned review responsibilities without being the employee’s formal manager. This allows V.Two to distribute review work before a formal management structure exists.

A management group member uses the system to:

- See the employees assigned to them for review.
- View review packets.
- Add notes and review summaries.
- Participate in feedback or calibration workflows if added later.

## 4. Authentication and Permissions

V.Two is using Microsoft Authenticator / Microsoft identity-based sign-in. The system should be designed to integrate with Microsoft authentication so users can sign in securely and receive role-based permissions.

### 4.1 Authentication Requirements

The system should support:

- Microsoft sign-in.
- Pulling basic user identity information where available, such as name, email, and account identifier.
- Matching authenticated users to employee records.
- Preventing users from accessing records they should not see.

### 4.2 Permission Roles

The system should support the following roles:

#### Employee

Can view and edit their own profile, goals, updates, actions, evidence, feedback requests, quarterly updates, and annual self-review.

#### Reviewer

Can view employees assigned to them for review. Can add reviewer notes and review summaries for assigned employees. Should not automatically have global access.

#### Admin

Can manage employees, focus areas, goal paths, reviewer assignments, permissions, review cycles, prompt templates, and system configuration.

#### Management Group

A configurable permission group that admins can use when assigning review ownership. Members may be assigned individual employees or review queues.

### 4.3 Permission Design Notes

The system should not assume that every employee has a direct manager today. Reviewer assignment must be configurable by admin.

An employee may have:

- No assigned reviewer yet.
- One assigned reviewer.
- Multiple reviewers.
- A default reviewer based on group, location, level, role, or admin assignment.

The implementation should avoid hardcoding management hierarchy logic. Use flexible assignments.

## 5. Employee Profile and People Data

The system should track employee records and support pulling basic identity data from Microsoft authentication where possible.

### 5.1 Employee Fields

Each employee record should support:

- Employee ID.
- Full name.
- Preferred name.
- Email.
- Role or title.
- Level or seniority band.
- Location.
- Employment status.
- Start date.
- Department or team, if applicable.
- Assigned goal path.
- Assigned reviewer or reviewers.
- Assigned management group, if applicable.
- Permission role.
- Active/inactive flag.

### 5.2 Admin Employee Management

Admins should be able to:

- View all employees.
- Search and filter employees.
- Edit employee profile data.
- Assign goal paths.
- Assign reviewers.
- Assign employees to management groups.
- Mark employees active or inactive.
- View review completion status by employee.

### 5.3 User Story Examples

- As an admin, I want employee names and emails to be populated from Microsoft sign-in where possible so I do not manually maintain basic identity data.
- As an admin, I want to assign an employee to a goal path so their review experience reflects their role and level expectations.
- As an admin, I want to assign a reviewer from a dropdown so review responsibility can be distributed across the management group.
- As an admin, I want to see each employee’s location so I can understand team distribution and review coverage.
- As a reviewer, I only want to see employees assigned to me so sensitive review information is appropriately limited.
- As an employee, I want my own profile information to be visible but not burdensome to maintain.

## 6. Focus Areas

The system should organize employee goals and reflections around four company-level focus areas. The exact names may evolve, but the initial structure should assume four core areas.

Recommended starting focus areas:

1. Legacy
2. Craftsmanship / Quality
3. Client Focus
4. Growth & Ownership

Each focus area should have:

- Name.
- Short description.
- Longer definition.
- Employee-facing reflection question.
- Example goals.
- Example actions.
- Example evidence.
- Level-specific expectations.
- Admin-configurable active/inactive status.
- Display order.

### 6.1 Legacy

Legacy means the employee is creating lasting value beyond the immediate task in front of them. This may include improving systems, documenting knowledge, mentoring others, creating reusable assets, strengthening client trust, or leaving work better than they found it.

Employee-facing question:

> What are you building, improving, or leaving behind that creates value beyond the immediate task?

Example goals:

- Create reusable documentation for a recurring delivery process.
- Mentor another team member through a new responsibility.
- Improve a client workflow so future work is easier and clearer.
- Build a repeatable pattern, template, or tool that others can use.

Example evidence:

- Links to documentation.
- Examples of reusable components or templates.
- Feedback from teammates.
- Before-and-after examples of improved process.
- Notes on knowledge transfer or mentorship.

### 6.2 Craftsmanship / Quality

Craftsmanship means the employee takes pride in the quality, clarity, maintainability, and reliability of their work. This should apply across disciplines, including engineering, product, design, QA, delivery, operations, and client communication.

Employee-facing question:

> How are you improving the quality, clarity, reliability, or usefulness of the work you deliver?

Example goals:

- Improve the consistency of project documentation.
- Reduce defects or rework in a delivery area.
- Create clearer acceptance criteria or QA expectations.
- Refactor or improve an existing system area.
- Improve design consistency or usability.

Example evidence:

- Completed improvements.
- QA results.
- Before-and-after screenshots.
- Pull requests or delivery notes.
- Client or team feedback.
- Reduced issue volume or rework.

### 6.3 Client Focus

Client focus means the employee understands the client’s context, communicates clearly, anticipates needs, and makes decisions that improve the client’s experience and outcomes.

Employee-facing question:

> How are you helping clients feel informed, supported, confident, and successful?

Example goals:

- Improve communication rhythm with a client.
- Clarify ambiguous requirements before work begins.
- Proactively surface risks or tradeoffs.
- Strengthen demo readiness or stakeholder alignment.
- Help translate technical work into client-understandable value.

Example evidence:

- Client feedback.
- Meeting notes.
- Improved status updates.
- Examples of proactive communication.
- Reduced client confusion or escalation.
- Stronger demo or delivery outcomes.

### 6.4 Growth & Ownership

Growth and ownership means the employee is actively improving their own capability, taking responsibility for outcomes, and increasing their ability to operate independently and thoughtfully.

Employee-facing question:

> Where are you increasing your ownership, judgment, autonomy, or capability?

Example goals:

- Take ownership of a new workstream or responsibility.
- Improve a skill relevant to the role.
- Ask for and apply feedback.
- Lead a meeting, demo, or delivery area.
- Improve planning, estimation, communication, or follow-through.

Example evidence:

- Examples of increased responsibility.
- Feedback received and acted on.
- Completed learning or practice.
- Reflections on what changed.
- Specific examples where the employee made better decisions over time.

## 7. Goal Paths

A goal path is an admin-configurable set of focus-area expectations for a person, role, level, or growth track. The purpose is to give employees a starting structure without forcing every person into the exact same goals.

### 7.1 Goal Path Requirements

Admins should be able to create and assign goal paths.

Each goal path should include:

- Goal path name.
- Description.
- Intended level or audience.
- Required focus areas.
- Optional focus areas.
- Suggested goal examples.
- Suggested action examples.
- Level-specific expectations.
- Whether the employee must create at least one goal per focus area.
- Whether the employee may add additional goals.

### 7.2 Example Goal Paths

#### Individual Contributor

Emphasis:

- Craftsmanship / Quality
- Client Focus
- Growth & Ownership
- Legacy through documentation, reusable patterns, and team contribution

#### Senior Contributor

Emphasis:

- Higher ownership and autonomy.
- Stronger client judgment.
- Mentorship and reusable knowledge.
- Contribution to delivery quality beyond personal tasks.

#### Senior / Go-to-Market Contributor

Emphasis:

- Client insight.
- Reusable delivery stories.
- Thoughtful contribution to V.Two’s market positioning.
- Identifying examples, case studies, patterns, or lessons that support business development.

#### Lead / Management Path

Emphasis:

- Coaching and mentorship.
- Review participation.
- Delivery oversight.
- Client confidence.
- Team quality systems.

### 7.3 User Stories

- As an admin, I want to create a goal path for senior contributors so their goals emphasize leadership, mentorship, client judgment, and go-to-market contribution.
- As an admin, I want to assign a goal path to an employee so the employee receives relevant guidance without needing a custom review structure.
- As an employee, I want suggested goals based on my path so I am not starting from a blank page.
- As an employee, I want to customize my goals within the assigned focus areas so the goals reflect my real work.
- As a reviewer, I want to see the employee’s assigned goal path so I understand what expectations they were working against.

## 8. Goals

Employees should create goals against focus areas. The system should encourage enough structure to make goals reviewable, but not so much that people avoid using it.

### 8.1 Goal Fields

Each goal should include:

- Goal title.
- Focus area.
- Description.
- Why this matters.
- Target outcome.
- Status.
- Confidence or progress indicator.
- Created date.
- Updated date.
- Target review cycle or year.
- Optional due date.
- Related actions.
- Related evidence.
- Related feedback.

### 8.2 Goal Statuses

Recommended statuses:

- Not started.
- In progress.
- On track.
- At risk.
- Completed.
- Paused.
- No longer relevant.

### 8.3 Goal Creation UX

Goal creation should be guided.

The employee should be able to:

- Choose a focus area.
- See the definition and reflection question for that focus area.
- Select from example goals or start from scratch.
- Add a short title.
- Add a short description.
- Optionally add what success would look like.
- Save quickly.

The system should avoid forcing employees to write long essays when creating goals.

### 8.4 User Stories

- As an employee, I want to create a goal from an example so I can get started quickly.
- As an employee, I want to write my own goal so the system does not feel generic.
- As an employee, I want to attach actions and evidence to a goal over time so my progress is captured continuously.
- As a reviewer, I want to see goals grouped by focus area so I can understand the employee’s development story quickly.
- As an admin, I want to define whether a goal path requires one goal per focus area so expectations are consistent.

## 9. Actions, Updates, and Evidence

The system should make it easy for employees to add small updates throughout the year. These updates should later roll up into quarterly and annual summaries.

### 9.1 Update Types

Employees should be able to add:

- Action taken.
- Win.
- Lesson learned.
- Feedback received.
- Feedback given.
- Client example.
- Quality improvement.
- Process improvement.
- Mentorship example.
- Reusable asset created.
- Risk identified or solved.
- Reflection.
- Link or attachment.

### 9.2 Update Fields

Each update should include:

- Update type.
- Short title.
- Description.
- Date.
- Related focus area.
- Related goal.
- Optional project or client.
- Optional colleague involved.
- Optional attachment or link.
- Optional visibility setting.
- Optional tags.

### 9.3 Quick Add UX

The system should include a prominent “Add Update” or “Capture Something” button.

The quick-add flow should allow employees to enter a meaningful update in under two minutes.

Recommended quick-add prompts:

- What happened?
- What focus area does this support?
- Do you want to attach it to a goal?
- Is there a link, file, screenshot, or note that supports it?

The system should avoid making every update feel like a formal review entry.

### 9.4 Evidence and Attachments

The system should support evidence links and uploads.

Evidence may include:

- URLs.
- Documents.
- Screenshots.
- Notes.
- Pull request links.
- Figma links.
- Jira links.
- Client notes.
- Emails or copied feedback excerpts.

The system should distinguish between raw evidence and synthesized review highlights.

### 9.5 User Stories

- As an employee, I want to quickly add an action or win when it happens so I do not have to remember everything at the end of the year.
- As an employee, I want to attach an update to a goal so my progress is organized automatically.
- As an employee, I want to add an update without knowing exactly where it belongs so I can capture it first and organize it later.
- As a reviewer, I want the system to summarize updates instead of showing every raw item by default.
- As a reviewer, I want to expand into raw evidence when needed so I can validate the summary.
- As an admin, I want update types to be configurable so the system can evolve with our review process.

## 10. Feedback Collection

The system should allow employees and reviewers to gather feedback from colleagues without creating a chaotic review packet.

### 10.1 Feedback Goals

Feedback should be:

- Easy to request.
- Easy to give.
- Structured enough to be useful.
- Connected to focus areas where possible.
- Summarized for reviewers.
- Not overwhelming.

### 10.2 Feedback Request Flow

An employee should be able to request feedback from a colleague.

The request should include:

- Recipient.
- Optional context.
- Focus area or goal.
- Prompt type.
- Requested due date.
- Whether feedback is visible to employee, reviewer, or both.

### 10.3 Feedback Prompt Examples

General feedback:

> What is one thing this person did well that had a positive impact?

Growth feedback:

> What is one area where this person could increase clarity, ownership, quality, or client impact?

Focus-area feedback:

> Based on your work with this person, where have you seen evidence of client focus, craftsmanship, ownership, or legacy-building?

Lightweight structured feedback:

- What should they keep doing?
- What should they start doing?
- What should they consider changing?

### 10.4 Reviewer Feedback View

Reviewers should not see feedback as a long unstructured pile by default.

The reviewer view should show:

- Feedback summary.
- Number of feedback responses.
- Feedback grouped by focus area.
- Notable themes.
- Positive examples.
- Growth themes.
- Raw feedback expandable only when needed.

### 10.5 User Stories

- As an employee, I want to request feedback from a colleague so I can include perspectives beyond my own self-reflection.
- As a colleague, I want to give feedback quickly so I am not burdened by a long review form.
- As a reviewer, I want feedback summarized by theme so I can understand patterns without reading every response first.
- As an admin, I want to define feedback prompts so feedback is consistent across the company.
- As an admin, I want to control whether feedback is visible to the employee, the reviewer, or both.

## 11. Quarterly Check-ins

The system should prompt employees quarterly to review and update their goals. The quarterly check-in should be lightweight and should mostly synthesize what has already been captured.

### 11.1 Quarterly Prompt Goals

Quarterly prompts should help employees:

- Revisit goals.
- Update status.
- Add missing evidence.
- Reflect on progress.
- Identify blockers.
- Adjust goals if needed.

### 11.2 Quarterly Check-in Fields

Each quarterly check-in should include:

- Review period.
- Goal status updates.
- Most important progress.
- Most useful evidence.
- Feedback received.
- Blockers or risks.
- Goal adjustments.
- Support needed.
- Short reflection.

### 11.3 UX Requirements

The quarterly check-in should pre-fill relevant data:

- Existing goals.
- Recent updates.
- Related evidence.
- Feedback received.
- Prior check-in notes.

Employees should be prompted to confirm, edit, or add to the summary rather than write everything from scratch.

### 11.4 User Stories

- As an employee, I want quarterly reminders so I keep my goals current throughout the year.
- As an employee, I want the quarterly form to pull in my recent updates so I am not starting from nothing.
- As an employee, I want to mark a goal as changed or no longer relevant so my review reflects reality.
- As a reviewer, I want to see quarterly progress in chronological order so I can understand the employee’s growth over time.
- As an admin, I want to configure quarterly prompt dates and questions so the process can evolve.

## 12. Annual Review

The annual review should be a synthesis of the year, not a separate manual document. Employees should complete an annual self-review using their goals, quarterly updates, feedback, and evidence.

### 12.1 Annual Review Goals

The annual review should help employees:

- Reflect on their year.
- Show progress against goals.
- Highlight meaningful examples.
- Identify growth areas.
- Prepare for a review conversation.

The annual review should help reviewers:

- Quickly understand the employee’s year.
- See progress by focus area.
- Review evidence and feedback themes.
- Add reviewer notes and outcomes.
- Compare expectations against actual examples.

### 12.2 Annual Self-Review Structure

Recommended sections:

1. Year summary.
2. Progress by focus area.
3. Goals completed or advanced.
4. Most meaningful examples.
5. Feedback themes.
6. Areas of growth.
7. Support needed.
8. Goals for next cycle.

### 12.3 Reviewer Review Packet

The system should generate a reviewer-facing packet for each employee.

The packet should include:

- Employee profile summary.
- Role, level, location, and goal path.
- Assigned focus areas.
- Goals and status.
- Quarterly summaries.
- Annual self-review.
- Feedback summary.
- Evidence highlights.
- Reviewer notes section.
- Recommended discussion questions.
- Completion status.

### 12.4 Reviewer UX

The reviewer should see a clean, prioritized summary first.

Recommended hierarchy:

1. Overall snapshot.
2. Review readiness status.
3. Key accomplishments.
4. Growth themes.
5. Goals by focus area.
6. Feedback themes.
7. Quarterly progression.
8. Raw evidence, expandable.
9. Reviewer notes and final summary.

The reviewer should not be forced to open multiple files or manually consolidate information.

### 12.5 User Stories

- As an employee, I want my annual review to build from the updates I already entered so I do not have to recreate the year from memory.
- As an employee, I want to edit the annual summary before submitting so it reflects my voice and judgment.
- As a reviewer, I want an employee review packet that is concise but expandable so I can prepare efficiently.
- As a reviewer, I want to add notes while reviewing so my assessment is captured in the same system.
- As an admin, I want to monitor annual review completion so I know who is ready, incomplete, or blocked.

## 13. Reviewer Dashboard

The reviewer dashboard should make it easy to manage review workload.

### 13.1 Reviewer Dashboard Requirements

A reviewer should be able to see:

- Employees assigned to them.
- Review cycle status.
- Last employee update.
- Quarterly check-in completion.
- Annual review completion.
- Feedback response count.
- Review packet readiness.
- Reviewer note status.

### 13.2 Suggested Statuses

- Not started.
- Employee in progress.
- Employee submitted.
- Feedback pending.
- Ready for reviewer.
- Reviewer in progress.
- Review complete.

### 13.3 Reviewer Actions

Reviewers should be able to:

- Open review packet.
- Add reviewer notes.
- Request more information.
- Mark review as reviewed.
- Add follow-up items.
- Export or download review summary if needed.

### 13.4 User Stories

- As a reviewer, I want a dashboard of assigned employees so I can manage review work in one place.
- As a reviewer, I want to know which reviews are ready so I do not waste time checking incomplete submissions.
- As a reviewer, I want to see feedback counts and quarterly completion status before opening the full packet.
- As a reviewer, I want to add follow-up questions so the review conversation is easier to prepare for.

## 14. Admin Dashboard

The admin dashboard should provide company-wide visibility into adoption, review status, assignments, and configuration.

### 14.1 Admin Dashboard Requirements

Admins should be able to see:

- All employees.
- Goal path assignment status.
- Reviewer assignment status.
- Quarterly completion status.
- Annual review completion status.
- Feedback request and response status.
- Employees without reviewers.
- Reviewers with high workload.
- Inactive employees.
- Permission roles.

### 14.2 Admin Configuration

Admins should be able to configure:

- Focus areas.
- Goal paths.
- Level expectations.
- Prompt templates.
- Review cycles.
- Feedback prompts.
- Review statuses.
- Management group members.
- Reviewer assignments.

### 14.3 User Stories

- As an admin, I want to see which employees do not have reviewers assigned so no one is missed.
- As an admin, I want to filter employees by location, level, and goal path so I can manage review operations efficiently.
- As an admin, I want to edit focus area definitions so company expectations stay current.
- As an admin, I want to configure annual review prompts without engineering support.
- As an admin, I want to distribute employees across reviewers so one person does not receive every review.

## 15. Review Assignment Model

Because V.Two does not currently have a formal management structure for reviews, the system must support flexible review assignments.

### 15.1 Assignment Requirements

Admins should be able to assign reviewers:

- Manually by employee.
- In bulk.
- By goal path.
- By location.
- By level.
- By management group.
- By future default rules.

### 15.2 Assignment Data Model

Each review assignment should include:

- Employee.
- Reviewer.
- Review cycle.
- Assignment type.
- Assignment date.
- Assigned by.
- Active/inactive status.

### 15.3 User Stories

- As an admin, I want a dropdown of eligible reviewers so I can assign review ownership manually.
- As an admin, I want to assign multiple employees to one reviewer so I can distribute workload quickly.
- As an admin, I want to change reviewer assignments without losing review history.
- As a reviewer, I want to know why someone is in my review queue, such as annual review assignment or quarterly check-in review.

## 16. Data Presentation and Summarization

The system should prevent information overload by separating raw inputs from synthesized review views.

### 16.1 Employee View

Employees should see:

- Their current goals.
- Focus area definitions.
- Suggested next actions.
- Recent updates.
- Quarterly prompt status.
- Feedback requests.
- Annual review status.

### 16.2 Reviewer Summary View

Reviewers should see:

- Concise employee snapshot.
- Goals by focus area.
- Progress indicators.
- Most important updates.
- Feedback themes.
- Quarterly trajectory.
- Annual self-review.
- Expandable raw evidence.

### 16.3 Admin Summary View

Admins should see operational status, not every detail by default.

Admins should see:

- Completion metrics.
- Assignment gaps.
- Overdue items.
- Review workload distribution.
- Configuration status.

### 16.4 Summarization Rules

When summarizing employee data, the system should prioritize:

- Updates attached to active goals.
- Updates marked important by employee.
- Feedback from colleagues.
- Quarterly check-in highlights.
- Evidence connected to focus areas.
- Recent and repeated themes.

The system should avoid treating every small update as equally important.

## 17. User Experience Requirements

The system should feel easy and clear.

### 17.1 Employee UX Requirements

The employee experience should include:

- Clear homepage.
- Four focus areas visible.
- Simple “Add Update” button.
- Simple “Request Feedback” button.
- Current goals visible without digging.
- Prompts that explain what good input looks like.
- Examples available inline.
- Progress indicators.
- Minimal required fields.
- Draft saving.
- Mobile-friendly layout.

### 17.2 Reviewer UX Requirements

The reviewer experience should include:

- Assigned employee list.
- Status indicators.
- Review packet view.
- Expandable details.
- Note-taking area.
- Follow-up question area.
- Completion actions.

### 17.3 Admin UX Requirements

The admin experience should include:

- Configuration pages.
- Employee table.
- Assignment tools.
- Review cycle management.
- Permission management.
- Completion dashboard.

### 17.4 Design Guidance

The interface should avoid large blank text areas without prompts. Use examples, chips, buttons, dropdowns, and guided forms where helpful.

The system should not feel like an HR compliance form. It should feel like a practical growth journal with structured review outputs.

## 18. Notifications and Prompts

The system should support reminders for periodic updates.

### 18.1 Notification Types

Recommended notification types:

- Quarterly check-in open.
- Quarterly check-in due soon.
- Annual self-review open.
- Annual self-review due soon.
- Feedback request received.
- Feedback request reminder.
- Reviewer packet ready.
- Review assignment changed.

### 18.2 Prompt Timing

Initial suggested cadence:

- Employees can add updates anytime.
- Quarterly prompts occur four times per year.
- Annual self-review opens near review season.
- Feedback can be requested anytime, with specific review-cycle prompts if needed.

### 18.3 User Stories

- As an employee, I want a quarterly reminder so I remember to update my goals before review season.
- As a colleague, I want a reminder if I have not completed requested feedback.
- As a reviewer, I want to know when an employee’s review packet is ready.
- As an admin, I want to configure reminder timing so the system matches company process.

## 19. Reporting and Exports

The system should support reporting without making employees feel like they are being constantly scored.

### 19.1 Admin Reports

Admins should be able to report on:

- Completion rates.
- Employees missing goals.
- Employees missing reviewers.
- Quarterly check-in completion.
- Annual review completion.
- Feedback response rates.
- Review workload by reviewer.

### 19.2 Reviewer Reports

Reviewers should be able to export or view:

- Review packet.
- Review notes.
- Employee self-review.
- Feedback summary.

### 19.3 Employee Reports

Employees should be able to view or export:

- Their goals.
- Their updates.
- Their annual self-review.
- Their feedback if visible to them.

## 20. Suggested Data Model

The implementation may adjust based on the existing system architecture, but should account for the following entities.

### 20.1 Entities

#### User

Represents authenticated system user.

Fields:

- id
- auth_provider_id
- email
- name
- role
- created_at
- updated_at

#### Employee

Represents employee profile.

Fields:

- id
- user_id
- full_name
- preferred_name
- email
- title
- level
- location
- department
- start_date
- employment_status
- assigned_goal_path_id
- created_at
- updated_at

#### FocusArea

Fields:

- id
- name
- short_description
- definition
- reflection_question
- display_order
- active
- created_at
- updated_at

#### GoalPath

Fields:

- id
- name
- description
- intended_level
- active
- created_at
- updated_at

#### GoalPathFocusArea

Fields:

- id
- goal_path_id
- focus_area_id
- required
- level_expectation
- example_goals
- example_actions
- display_order

#### Goal

Fields:

- id
- employee_id
- focus_area_id
- goal_path_id
- title
- description
- why_it_matters
- target_outcome
- status
- progress_indicator
- cycle_id
- due_date
- created_at
- updated_at

#### UpdateEntry

Fields:

- id
- employee_id
- goal_id
- focus_area_id
- update_type
- title
- description
- date
- project_or_client
- importance_flag
- visibility
- created_at
- updated_at

#### Evidence

Fields:

- id
- employee_id
- update_entry_id
- goal_id
- evidence_type
- title
- url
- file_path
- description
- created_at
- updated_at

#### FeedbackRequest

Fields:

- id
- requester_employee_id
- recipient_user_id
- related_employee_id
- goal_id
- focus_area_id
- prompt_template_id
- message
- due_date
- visibility
- status
- created_at
- updated_at

#### FeedbackResponse

Fields:

- id
- feedback_request_id
- respondent_user_id
- related_employee_id
- response_text
- keep_doing
- start_doing
- change_or_improve
- focus_area_id
- visibility
- submitted_at

#### ReviewCycle

Fields:

- id
- name
- type
- start_date
- end_date
- due_date
- status
- created_at
- updated_at

#### QuarterlyCheckIn

Fields:

- id
- employee_id
- cycle_id
- summary
- progress
- blockers
- support_needed
- goal_changes
- submitted_at
- status

#### AnnualReview

Fields:

- id
- employee_id
- cycle_id
- year_summary
- focus_area_summary
- accomplishments
- feedback_themes
- growth_areas
- support_needed
- next_cycle_goals
- submitted_at
- status

#### ReviewAssignment

Fields:

- id
- employee_id
- reviewer_user_id
- cycle_id
- assignment_type
- assigned_by_user_id
- active
- created_at
- updated_at

#### ReviewerNote

Fields:

- id
- employee_id
- reviewer_user_id
- cycle_id
- note_type
- note_text
- follow_up_question
- reviewer_summary
- status
- created_at
- updated_at

#### PromptTemplate

Fields:

- id
- name
- prompt_type
- prompt_text
- focus_area_id
- active
- created_at
- updated_at

## 21. Core Pages and Flows

### 21.1 Employee Home

Purpose: Give employees one simple place to see what matters now.

Should include:

- Current review cycle.
- Four focus areas.
- Current goals.
- Add update button.
- Request feedback button.
- Quarterly check-in status.
- Annual review status.
- Recent updates.

### 21.2 Goal Setup Flow

Purpose: Help an employee create meaningful goals with minimal friction.

Flow:

1. Employee opens goal setup.
2. System shows assigned goal path.
3. System shows focus areas and definitions.
4. Employee selects a focus area.
5. System shows example goals.
6. Employee creates or customizes goal.
7. Employee saves goal.
8. System returns employee to goal overview.

### 21.3 Quick Update Flow

Purpose: Let employees capture progress quickly.

Flow:

1. Employee clicks Add Update.
2. Employee chooses update type.
3. Employee writes short description.
4. Employee selects related focus area.
5. Employee optionally attaches to goal.
6. Employee optionally adds link or file.
7. Employee saves.

### 21.4 Feedback Request Flow

Purpose: Let employees gather colleague input.

Flow:

1. Employee clicks Request Feedback.
2. Employee selects colleague.
3. Employee selects prompt type or focus area.
4. Employee adds optional context.
5. System sends request.
6. Recipient completes lightweight feedback form.
7. Feedback appears according to visibility rules.

### 21.5 Quarterly Check-in Flow

Purpose: Turn ongoing updates into periodic progress tracking.

Flow:

1. Employee receives quarterly prompt.
2. Employee opens check-in.
3. System preloads goals, updates, feedback, and evidence.
4. Employee confirms or edits summary.
5. Employee updates goal statuses.
6. Employee adds blockers or support needed.
7. Employee submits.

### 21.6 Annual Review Flow

Purpose: Generate a year-end self-review from accumulated data.

Flow:

1. Employee opens annual review.
2. System shows generated or assembled summaries by focus area.
3. Employee edits and adds context.
4. Employee selects most important examples.
5. Employee reflects on growth areas.
6. Employee proposes next-cycle goals.
7. Employee submits.
8. Reviewer receives review packet.

### 21.7 Reviewer Flow

Purpose: Make review preparation easy.

Flow:

1. Reviewer opens dashboard.
2. Reviewer sees assigned employees and status.
3. Reviewer opens employee packet.
4. Reviewer reviews snapshot, summaries, goals, feedback, and evidence.
5. Reviewer adds notes and follow-up questions.
6. Reviewer marks review complete or ready for conversation.

### 21.8 Admin Assignment Flow

Purpose: Let admin distribute review work.

Flow:

1. Admin opens employee table.
2. Admin filters employees by location, level, path, or status.
3. Admin selects employee or group of employees.
4. Admin assigns reviewer from dropdown.
5. System saves assignment and updates reviewer dashboards.

## 22. MVP Scope

The first build should focus on a strong core system that is usable and expandable.

### 22.1 MVP Must Include

- Microsoft-based authentication integration or authentication-ready architecture.
- Employee profile records.
- Admin employee table.
- Focus area configuration.
- Goal path configuration.
- Employee goal creation.
- Employee quick updates.
- Evidence links or attachments.
- Feedback request and response flow.
- Quarterly check-in flow.
- Annual self-review flow.
- Reviewer assignment.
- Reviewer dashboard.
- Reviewer packet view.
- Admin dashboard for completion and assignments.
- Role-based permissions.

### 22.2 MVP Should Avoid

- Complex scoring systems.
- Overly rigid performance ratings.
- Forced long-form review writing for every update.
- Hardcoded manager hierarchy.
- Raw activity feeds as the main reviewer experience.
- Excessive required fields.

## 23. Future Enhancements

Potential future enhancements:

- AI-assisted summarization of updates and feedback.
- Suggested review talking points.
- Calibration views for management.
- Career path recommendations.
- Integration with Slack, Teams, Jira, GitHub, Figma, or project systems.
- Automatic import of selected feedback or project evidence.
- Review conversation scheduling.
- Compensation or promotion workflow, if appropriate later.
- Trend reporting across focus areas.
- Goal recommendations based on level and prior performance.

## 24. Acceptance Criteria

The system should be considered successful when:

- Employees can create goals against assigned focus areas without needing admin help.
- Employees can add an update in under two minutes.
- Employees can request feedback from colleagues.
- Quarterly check-ins pull from existing goals and updates.
- Annual self-reviews are generated from existing captured information rather than written from scratch.
- Reviewers can open one packet per employee and see the most important information first.
- Admins can assign reviewers without engineering support.
- Admins can configure focus areas, goal paths, and prompts.
- Permissions prevent employees from seeing other employees’ private review information.
- The system works without assuming a formal management hierarchy.

## 25. Detailed User Stories

### Employee Stories

1. As an employee, I want to see my assigned goal path so I understand what kind of growth expectations apply to me.
2. As an employee, I want to see the four company focus areas so I know how V.Two defines meaningful contribution.
3. As an employee, I want each focus area to include plain-language definitions and examples so I am not guessing what to write.
4. As an employee, I want to create goals under each focus area so my growth plan is structured.
5. As an employee, I want suggested goals so I can get started quickly.
6. As an employee, I want to customize suggested goals so they apply to my real work.
7. As an employee, I want to add a quick update whenever something happens so I do not forget it by review time.
8. As an employee, I want to attach links, files, screenshots, or notes as evidence so my progress is backed by examples.
9. As an employee, I want to connect updates to goals so the system organizes my progress automatically.
10. As an employee, I want to add an update without attaching it to a goal immediately so capturing progress stays easy.
11. As an employee, I want quarterly prompts so I remember to revisit my goals.
12. As an employee, I want quarterly check-ins to show my existing updates so I only need to edit and confirm.
13. As an employee, I want to request feedback from a colleague so my review includes perspectives beyond my own.
14. As an employee, I want to control or understand feedback visibility so I know who can see it.
15. As an employee, I want an annual review draft assembled from my goals, updates, and feedback so I do not start from a blank document.
16. As an employee, I want to edit my annual review before submitting so it reflects my own judgment.
17. As an employee, I want to see what is incomplete before review deadlines so I can finish required items.
18. As an employee, I want the system to feel lightweight and useful so I keep using it throughout the year.

### Reviewer Stories

1. As a reviewer, I want to see employees assigned to me so I know who I am responsible for reviewing.
2. As a reviewer, I want to see review readiness status so I know which reviews need my attention.
3. As a reviewer, I want one consolidated packet per employee so I do not have to open multiple documents.
4. As a reviewer, I want a concise summary first so I can understand the employee’s year quickly.
5. As a reviewer, I want goals grouped by focus area so I can assess progress against company expectations.
6. As a reviewer, I want to see quarterly progress over time so I can understand trajectory.
7. As a reviewer, I want feedback summarized by theme so I do not have to manually synthesize every response.
8. As a reviewer, I want raw feedback and evidence to be expandable so I can validate details when needed.
9. As a reviewer, I want to add notes and follow-up questions directly in the packet so review prep stays organized.
10. As a reviewer, I want to mark a review complete so admin can track progress.
11. As a reviewer, I want to know if an employee has not completed their self-review so I do not begin too early.
12. As a reviewer, I want to avoid receiving excessive raw data so the system is actually usable.

### Admin Stories

1. As an admin, I want to manage employees so the system reflects the current company structure.
2. As an admin, I want employee names and emails to pull from Microsoft identity where possible so setup is easier.
3. As an admin, I want to assign permission roles so employees, reviewers, and admins see the correct information.
4. As an admin, I want to create and edit focus areas so V.Two’s definitions stay consistent.
5. As an admin, I want to create goal paths so different levels or roles receive relevant guidance.
6. As an admin, I want to assign goal paths to employees so the system can guide them appropriately.
7. As an admin, I want to assign reviewers manually so we can operate before a formal management hierarchy exists.
8. As an admin, I want to assign reviewers in bulk so review operations are not painful.
9. As an admin, I want to see employees without reviewers so no one is missed.
10. As an admin, I want to see reviewer workload so reviews can be distributed fairly.
11. As an admin, I want to configure quarterly and annual prompts so the review process can evolve.
12. As an admin, I want to see completion status by employee so I can manage review deadlines.
13. As an admin, I want to filter by level, location, goal path, and review status so I can manage the process efficiently.
14. As an admin, I want to update templates without code changes so the system remains maintainable.

### Feedback Provider Stories

1. As a feedback provider, I want a lightweight feedback request so I can respond quickly.
2. As a feedback provider, I want context for what feedback is being requested so my response is relevant.
3. As a feedback provider, I want clear prompts so I do not have to figure out what kind of feedback is useful.
4. As a feedback provider, I want to submit feedback without navigating a complex review system.

## 26. Implementation Guidance for Codex

Before implementing, inspect the existing application architecture, authentication approach, data layer, component system, routing, styling, and permissions model. Do not assume the stack. Adapt this product plan to the existing codebase.

Implementation should proceed in phases:

### Phase 1: Architecture and Data Foundation

- Audit current app structure.
- Identify existing auth and permission handling.
- Design database schema or data model based on the entities above.
- Add migrations or schema definitions.
- Seed initial focus areas and one or two sample goal paths.
- Ensure role-based access patterns are clear.

### Phase 2: Employee Experience

- Build employee home.
- Build goal setup.
- Build quick update flow.
- Build evidence attachment/linking.
- Build feedback request flow.

### Phase 3: Review Cycles

- Build quarterly check-in flow.
- Build annual self-review flow.
- Reuse existing goals and updates to prefill review forms where possible.

### Phase 4: Reviewer Experience

- Build reviewer dashboard.
- Build employee review packet.
- Build reviewer notes and status changes.
- Add expandable raw evidence and feedback.

### Phase 5: Admin Experience

- Build employee management table.
- Build focus area configuration.
- Build goal path configuration.
- Build reviewer assignment tools.
- Build review status dashboard.

### Phase 6: Polish, Testing, and Hardening

- Add permission tests.
- Add user flow tests.
- Add responsive layout testing.
- Add empty states.
- Add loading states.
- Add error states.
- Add form validation.
- Confirm reviewers cannot access unassigned employees.
- Confirm employees cannot access other employee review data.
- Confirm admin configuration changes appear in employee flows.

## 27. Non-Negotiable Build Expectations

The implementation must be clean, maintainable, and user-friendly.

Do not build this as a collection of disconnected forms. The system must feel like one coherent workflow from goals to updates to check-ins to review packets.

Do not make the reviewer experience a raw activity dump. The reviewer must get a synthesized view with drill-down access.

Do not hardcode V.Two’s future management structure. Reviewer assignment must be configurable.

Do not require employees to write long-form content at every step. Use guided prompts, examples, dropdowns, chips, and short text fields where possible.

Do not bury definitions and examples. Employees should see guidance exactly where they are creating goals or updates.

Do not treat review configuration as static engineering work. Focus areas, prompts, goal paths, and reviewer assignments should be admin-configurable.

## 28. Open Questions to Resolve During Build

Codex should identify the current system constraints and propose answers to these during implementation:

1. What existing authentication system is in place, and how should Microsoft identity integration be connected?
2. Is there an existing employee/user table, or does one need to be created?
3. What file upload or storage system already exists?
4. What role-based access control patterns already exist?
5. What design system or component library should this use?
6. How should notifications be delivered in the current system: email, in-app, Teams, or future integration?
7. Should feedback be anonymous, named, or configurable by request?
8. Should employees be required to create one goal per focus area, or should that be configurable by goal path?
9. Should reviewer notes be visible only to reviewers/admins, or eventually shared with employees?
10. What should be included in the initial MVP versus a later enhancement?

## 29. Final Product Outcome

The final product should give V.Two a practical, lightweight, self-led review system where employees continuously capture meaningful work, feedback, progress, and growth against clear company focus areas. Admins should be able to guide expectations through goal paths and definitions. Reviewers should receive one clean, synthesized packet per employee instead of scattered documents and excessive raw inputs.

The system should help V.Two make reviews easier, fairer, more consistent, and more useful without creating a heavy HR process that people avoid using.
