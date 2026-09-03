**# Vrompt Phase 1 MVP — Coding Prompts by Phase**

**## Global instruction for every phase**

Before making changes, inspect the existing frontend, backend, Prisma schema, Docker configuration, shared packages, tests, and current implementation.

Preserve working architecture and existing functionality unless it conflicts with the requirements of the current phase.

For every phase:

\- Implement frontend and backend completely where applicable.

\- Do not add future-phase features early.

\- Use production-quality TypeScript.

\- Avoid mock-only implementations.

\- Add proper validation and error handling.

\- Maintain responsive UX for desktop, tablet, and mobile.

\- Preserve accessibility.

\- Add or update tests.

\- Run lint, type-check, unit tests, integration tests, and builds.

\- Fix any failures caused by the implementation.

\- Do not consider the phase complete until the requested functionality works end-to-end.

\- Summarize files changed, database changes, tests performed, and remaining issues.

**---**

**# Phase 1 — Repository and Monorepo Foundation**

Set up the Vrompt project foundation as a production-ready TypeScript monorepo.

Vrompt is an AI prompt repository where users can discover, publish, version, save, copy, organize, and create Variants of AI prompts.

Create this basic structure:

\`\`\`text

vrompt/

├── apps/

│   ├── web/

│   └── api/

├── packages/

│   ├── shared/

│   ├── types/

│   └── config/

├── infrastructure/

├── .github/

├── docker-compose.yml

├── .env.example

└── README.md

\`\`\`

Requirements:

\- Configure workspace package management.

\- Add shared TypeScript configuration.

\- Add ESLint and formatting rules.

\- Add consistent scripts for dev, build, lint, type-check, and test.

\- Configure \`.gitignore\`.

\- Create \`.env.example\`.

\- Do not implement business features yet.

\- Ensure both applications can be started independently and through root workspace commands.

\- Verify clean install and clean build.

**---**

**# Phase 2 — Next.js Frontend Foundation**

Create the Vrompt frontend using Next.js, TypeScript, App Router, and Tailwind CSS.

Build only the application foundation.

Requirements:

\- Responsive root layout.

\- Vrompt black-and-white brand styling.

\- Reusable page container.

\- Header/navigation foundation.

\- Desktop, tablet, and mobile breakpoints.

\- Loading UI.

\- Error UI.

\- Empty-state components.

\- Button, input, textarea, modal, badge, avatar, dropdown, tabs, card, tooltip, toast, pagination, skeleton, and form components.

\- Accessible keyboard behavior.

\- Light and dark presentation may be supported, but Vrompt's primary visual identity should remain monochrome.

\- Do not build actual repository functionality yet.

Create placeholder routes for:

\`\`\`text

/

 /login

 /register

 /explore

 /search

 /create

 /saved

 /collections

 /notifications

 /settings

 /u/[username]

 /p/[slug]

\`\`\`

Ensure production build succeeds.

**---**

**# Phase 3 — NestJS Backend Foundation**

Create the Vrompt backend using NestJS and TypeScript.

Requirements:

\- Modular monolith architecture.

\- Global API prefix \`/api/v1\`.

\- Environment configuration.

\- Global validation pipe.

\- Structured exception handling.

\- Request logging.

\- Health endpoint.

\- API versioning-ready structure.

\- Swagger/OpenAPI documentation for development.

\- Do not implement business functionality yet.

Create modules:

\`\`\`text

auth

users

profiles

prompts

prompt-versions

prompt-variants

categories

tags

bookmarks

likes

comments

follows

collections

search

notifications

reports

moderation

audit

prisma

common

health

\`\`\`

Ensure lint, type-check, tests, and build succeed.

**---**

**# Phase 4 — Docker Development Environment**

Dockerize the development foundation.

Create containers for:

\`\`\`text

vrompt-web

vrompt-api

vrompt-postgres

vrompt-redis

\`\`\`

Requirements:

\- Dockerfiles for Next.js and NestJS.

\- Docker Compose.

\- Persistent PostgreSQL volume.

\- Redis persistence only if necessary.

\- Health checks.

\- Environment variables.

\- Internal container networking.

\- Development-friendly startup.

\- PostgreSQL and Redis may be exposed locally for development, but production configuration must later keep them private.

Verify:

\`\`\`text

Next.js → NestJS

NestJS → PostgreSQL

NestJS → Redis

\`\`\`

All services must start successfully from one Docker Compose command.

**---**

**## Phase 5+ Environment and Media Rule

From Phase 5 onward, preserve the completed Phase 1–4 foundation and extend it without rebuilding or replacing working architecture unless required.

Vrompt must support two runtime modes:

```text
DEVELOPMENT
- Next.js hot reload
- NestJS watch mode
- PostgreSQL in Docker
- Redis in Docker
- Local filesystem storage for prompt evidence images
- Source bind mounts
- Normal code changes must apply without rebuilding Docker images

PRODUCTION
- Optimized Next.js production build
- Compiled NestJS production build
- PostgreSQL with persistent volume
- Redis internal-only
- Cloudinary for prompt evidence images
- Nginx reverse proxy + HTTPS
- No source bind mounts
- Immutable production images
```

Use a storage abstraction selected by environment:

```text
MEDIA_STORAGE_DRIVER=local       # development
MEDIA_STORAGE_DRIVER=cloudinary  # production
```

Evidence-image rules from Phase 5 onward:

- Evidence images are optional and attached to a specific PromptVersion.
- Maximum 3 evidence images per PromptVersion.
- Maximum 5 MB per image.
- Allow JPEG, PNG, and WebP only.
- Evidence must never be copied automatically when creating a Variant.
- Development stores evidence locally in a persistent mounted folder.
- Production stores evidence in Cloudinary and PostgreSQL stores only metadata/storage identifiers.
- Never store image binary data in PostgreSQL.
- Never expose Cloudinary secrets to the browser.

---

# Phase 5 — Prisma and Core Database Foundation**

Integrate Prisma with PostgreSQL.

Design the initial normalized schema for Vrompt.

Create at minimum:

\`\`\`text

User

Profile

RefreshToken

PromptRepository

PromptVersion

PromptVariable

PromptExample

PromptEvidenceImage

Category

Tag

PromptTag

Bookmark

Like

Comment

Follow

Collection

CollectionPrompt

Notification

Report

ModerationAction

AuditLog

\`\`\`

Core rules:

\- PromptRepository contains repository-level metadata.

\- Actual prompt content belongs in PromptVersion.

\- Published versions must remain historically preserved.

\- PromptRepository references its current version.

\- Use UUID/CUID-style identifiers consistently.

\- Add appropriate foreign keys.

\- Add unique constraints.

\- Add indexes for likely query paths.

\- Add createdAt and updatedAt where appropriate.

\- Use soft-delete/status fields where useful rather than destructive deletion.

\- Generate migration.

\- Generate Prisma Client.

\- Add Prisma service/module to NestJS.

Add `PromptEvidenceImage` with at minimum:

```text
id
promptVersionId
storageProvider
storageKey
secureUrl
originalFilename
mimeType
fileSize
width
height
altText
caption
sortOrder
createdAt
updatedAt
```

Use storage provider values such as:

```text
LOCAL
CLOUDINARY
```

Enforce the maximum 3-image rule in backend business logic and add an index on `promptVersionId`.

Create a media-storage abstraction in NestJS:

```text
MediaStorageService
├── LocalStorageAdapter
└── CloudinaryStorageAdapter
```

The prompt/version modules must depend on the storage abstraction, not directly on Cloudinary.

Create basic seed infrastructure but do not add large seed data yet.

**---**

**# Phase 6 — Authentication**

Implement production-quality authentication.

Requirements:

\- Register.

\- Login.

\- Logout.

\- Access token.

\- Refresh token.

\- Refresh-token rotation.

\- Password hashing using a secure algorithm.

\- Unique normalized email.

\- Unique username.

\- Secure authentication cookies where appropriate.

\- Token revocation.

\- Authentication guards.

\- Current-user endpoint.

\- Role support.

Initial roles:

\`\`\`text

USER

MODERATOR

ADMIN

\`\`\`

Frontend:

\- Registration form.

\- Login form.

\- Logout.

\- Authenticated state.

\- Protected route handling.

\- Validation messages.

\- Loading and failure states.

Security:

\- Do not store passwords or refresh tokens in plaintext.

\- Prevent user enumeration where practical.

\- Add login throttling.

\- Add basic brute-force protection.

Evidence upload endpoints must require authentication and repository/version ownership checks. Add upload rate limiting and never allow one user to manage another user's evidence images.

Test the complete flow end-to-end.

**---**

**# Phase 7 — User Profiles**

Implement user profiles.

Fields:

\`\`\`text

username

displayName

bio

avatar

website

createdAt

\`\`\`

Profile route:

\`\`\`text

/u/[username]

\`\`\`

Features:

\- View public profile.

\- Edit own profile.

\- Upload/change avatar using the same environment-aware storage abstraction where practical.

\- Show repository count.

\- Show followers.

\- Show following.

\- Show public repositories.

\- Show public collections.

\- Ownership validation.

\- Username validation.

\- Prevent users from modifying another user's profile.

Do not add advanced creator analytics yet.

**---**

**# Phase 8 — Categories and Tags**

Implement prompt organization.

Initial categories:

\`\`\`text

Coding

Design

Writing

Business

Marketing

Education

Research

Productivity

Data Analysis

Image Generation

Career

Entertainment

Other

\`\`\`

Requirements:

\- Category database records.

\- Tag database records.

\- Prompt-to-tag many-to-many relationship.

\- Slugs.

\- Admin-ready management structure.

\- Category listing endpoint.

\- Tag search/autocomplete endpoint.

\- Frontend selectors.

\- Prevent uncontrolled duplicate tag formatting.

\- Normalize tag names.

Seed the initial official categories.

**---**

**# Phase 9 — Create Prompt Repository**

Implement Vrompt's core repository creation flow.

Repository fields:

\`\`\`text

Title

Slug

Description

Prompt Content

Category

Tags

AI Compatibility

Variables

Example Input

Example Output

Evidence Images (optional, maximum 3)

Visibility

License

\`\`\`

Visibility:

\`\`\`text

PUBLIC

UNLISTED

PRIVATE

\`\`\`

Requirements:

\- Create repository.

\- Automatically create Version 1.

\- Prompt content must be stored in PromptVersion.

\- Associate variables/examples correctly.

\- Generate safe unique slug.

\- Creator becomes repository owner.

\- Draft form validation.

\- Unsaved-change protection.

\- Responsive prompt editor.

\- Preview before publishing.

\- Proper success/error states.

Evidence Image requirements:

- Allow 0–3 images for Version 1.
- Show `0/3`, `1/3`, `2/3`, `3/3`.
- Disable adding more images at 3.
- Support file picker and drag/drop.
- Show preview, remove, reorder, optional caption, and optional alt text.
- Show per-image validation and upload errors.
- Validate again on the backend.
- In development, save evidence to persistent local storage.
- In production, upload through the Cloudinary storage adapter.
- A failed upload must not silently lose the repository form data.

Do not add Create Variant yet.

**---**

**# Phase 10 — Prompt Repository Detail Page**

Build the flagship Vrompt repository page.

Suggested route:

\`\`\`text

/p/[slug]

\`\`\`

Display:

\- Repository title.

\- Creator.

\- Description.

\- Current version.

\- Prompt content.

\- Variables.

\- Examples.

\- Category.

\- Tags.

\- AI compatibility.

\- License.

\- Creation/update dates.

\- Public/private/unlisted handling.

Primary actions:

\`\`\`text

Copy Prompt

Save

Create Variant

Share

\`\`\`

Create tabs:

\`\`\`text

Overview

Prompt

Versions

Examples

Variants

Activity

\`\`\`

Create Variant may remain disabled until its phase is implemented.

The Examples tab must include Example Input, Example Output, and up to 3 Evidence Images for the currently selected PromptVersion. Use responsive thumbnails, lazy loading, preserved aspect ratio, captions/alt text, and an accessible enlarged image viewer. Display a short note that AI results may vary by model, settings, and model version.

Make this one of the most polished screens in Vrompt.

**---**

**# Phase 11 — Copy Prompt**

Implement Copy Prompt.

Requirements:

\- Copy current prompt version to clipboard.

\- Show clear success feedback.

\- Gracefully handle clipboard failures.

\- Track copy events.

\- Maintain a copy count or event record suitable for analytics.

\- Do not allow repeated clicks to artificially inflate counts without reasonable deduplication/rate rules.

\- Track which version was copied where appropriate.

Add Copy Prompt wherever repository previews reasonably need it.

Test desktop, tablet, and mobile.

**---**

**# Phase 12 — Prompt Versioning**

Implement immutable published prompt versioning.

Rules:

\- Editing a published prompt creates a new PromptVersion.

\- Never overwrite the previous published version.

\- Increment version numbers correctly.

\- Record changelog.

\- Record author.

\- Record timestamp.

\- Repository points to current version.

Support:

\`\`\`text

View Versions

View Specific Version

Create New Version

View Changelog

\`\`\`

Add basic version comparison.

Frontend should clearly distinguish:

\`\`\`text

Current Version

Previous Version

\`\`\`

Each PromptVersion may have its own 0–3 Evidence Images. Publishing a new version must not overwrite or detach evidence from previous versions. When viewing an old version, show that version's evidence.

Users must not confuse a repository Version with a Variant.

Version = same repository evolving.

Variant = separate repository based on another repository.

**---**

**# Phase 13 — Create Variant**

Implement Vrompt's Create Variant feature.

Use **\*\*Create Variant\*\*** consistently in UX. Do not use Fork or Remix terminology.

Flow:

\`\`\`text

Original Repository

→ Create Variant

→ Pre-filled editor

→ User modifies content/metadata

→ Publish separate repository

\`\`\`

Store lineage information such as:

\`\`\`text

sourcePromptId

rootPromptId

\`\`\`

Rules:

\- Variant becomes a separate repository.

\- Variant creator owns their repository.

\- Original repository remains unchanged.

\- Attribution cannot be removed.

\- Display:

Based on:

@creator / Original Repository

\- Record Variant relationship.

\- Increment Variant metrics safely.

\- Protect private/unavailable source repositories appropriately.

Do not copy the source repository's Evidence Images into the Variant. Evidence belongs to the version that produced it. The Variant creator may upload their own 0–3 evidence images after testing their Variant.

Test Variant-of-Variant scenarios.

**---**

**# Phase 14 — Variant Lineage**

Implement Variant Lineage.

Display related repository evolution:

\`\`\`text

Original

├── Variant A

│   ├── Variant A1

│   └── Variant A2

└── Variant B

\`\`\`

MVP requirements:

\- Simple hierarchical/list representation is sufficient.

\- Show direct source.

\- Show root repository.

\- Show child Variants.

\- Show Variant count.

\- Prevent cyclic lineage.

\- Optimize queries to avoid recursive performance problems.

\- Do not build a complex graphical visualization yet.

Use the term **\*\*Variant Lineage\*\*** throughout the product.

**---**

**# Phase 15 — Save / Bookmarks**

Implement Save.

Requirements:

\- Save repository.

\- Remove saved repository.

\- Prevent duplicate saves.

\- \`/saved\` page.

\- Pagination.

\- Sorting.

\- Empty state.

\- Saved state visible on repository cards and detail pages.

\- Private repository authorization must still apply.

Database uniqueness:

\`\`\`text

userId + promptRepositoryId

\`\`\`

Track save metrics separately from likes.

**---**

**# Phase 16 — Likes**

Implement lightweight repository likes.

Requirements:

\- Like.

\- Unlike.

\- Prevent duplicate likes.

\- Display like count.

\- Optimistic frontend interaction where reliable.

\- Roll back optimistic state if request fails.

\- Appropriate API idempotency.

Likes are secondary engagement signals.

Do not make likes the primary repository ranking metric.

**---**

**# Phase 17 — Comments**

Implement repository comments.

Requirements:

\- Create comment.

\- Edit own comment.

\- Delete own comment.

\- Basic reply support.

\- Report comment integration later.

\- Pagination or lazy loading.

\- Creator/moderator-safe permission handling.

\- Sanitized content.

\- Rate limits.

\- Accessible comment composer.

Keep nesting shallow for the MVP.

Do not build deeply nested discussion trees.

**---**

**# Phase 18 — Follow Creators**

Implement following.

Requirements:

\- Follow user.

\- Unfollow user.

\- Prevent self-follow.

\- Prevent duplicate follow.

\- Followers list.

\- Following list.

\- Counts.

\- Follow button on profile/repository creator areas.

\- Authorization and privacy-safe handling.

This will later power the Following activity feed.

**---**

**# Phase 19 — Collections**

Implement Vrompt Collections.

Users can create collections such as:

\`\`\`text

Best Coding Prompts

Study Toolkit

UI Design Prompts

Marketing Prompts

\`\`\`

Features:

\- Create collection.

\- Edit collection.

\- Delete/archive collection.

\- Add repository.

\- Remove repository.

\- Reorder repositories if practical.

\- Public/private visibility.

\- Collection detail page.

\- User collections page.

\- Prevent duplicate repository entries.

Collections reference existing repositories; they must not duplicate repository data.

**---**

**# Phase 20 — Search**

Implement repository-focused search.

Search:

\`\`\`text

Title

Description

Prompt text

Tags

Category

Creator

\`\`\`

Filters:

\`\`\`text

Category

AI Compatibility

Newest

Recently Updated

Most Copied

Most Saved

Most Variants

Most Liked

\`\`\`

Requirements:

\- PostgreSQL-based search first.

\- Pagination.

\- Query validation.

\- Search result highlighting where appropriate.

\- Mobile filter UX.

\- Empty state.

\- Search URL parameters so searches are shareable.

\- Proper indexes.

Search results may display the first optimized evidence thumbnail when available, but evidence is not itself searchable in Phase 1 and must not be required for ranking.

Do not add Elasticsearch, Typesense, Meilisearch, or vector search in Phase 1.

**---**

**# Phase 21 — Explore**

Implement \`/explore\`.

Sections can include:

\`\`\`text

Featured

Popular

Recently Updated

Most Copied

Most Saved

Most Variants

Categories

Starter Collections

\`\`\`

Requirements:

\- Repository-first presentation.

\- Reusable repository cards.

\- Proper pagination/load-more.

\- Avoid a generic social-media appearance.

\- Prioritize discovery and usefulness.

\- Only use genuine metrics and seeded-content labeling. Repository cards may use the first optimized evidence image as a thumbnail; otherwise show a clean Vrompt placeholder.

**---**

**# Phase 22 — Homepage**

Build the Vrompt public homepage.

Vrompt positioning:

**\*\*The repository for AI prompts.\*\***

Primary purpose:

Help visitors find useful AI prompts quickly.

Include:

\- Strong search.

\- Featured repositories.

\- Popular prompts.

\- Recently updated prompts.

\- Top categories.

\- Starter collections.

\- New repositories.

\- Clear Create Prompt CTA.

Do not turn the homepage into a generic social feed.

Featured/public repository cards may show one optimized evidence thumbnail while repository information remains primary.

Maintain Vrompt's professional black-and-white visual identity.

**---**

**# Phase 23 — Following Activity Feed**

Implement an activity feed for followed creators.

Show meaningful repository activity such as:

\`\`\`text

Published a repository

Published a new version

Created a Variant

Created a public collection

\`\`\`

Do not add generic status posts.

Requirements:

\- Following-only source.

\- Pagination.

\- Timestamp.

\- Repository links.

\- Creator links.

\- Avoid duplicated noisy events.

\- Respect repository visibility.

**---**

**# Phase 24 — Notifications**

Implement in-app notifications.

Initial notification types:

\`\`\`text

NEW\_FOLLOWER

PROMPT\_LIKED

PROMPT\_COMMENTED

COMMENT\_REPLIED

VARIANT\_CREATED

\`\`\`

Requirements:

\- Notification list.

\- Unread count.

\- Mark read.

\- Mark all read.

\- Links to appropriate content.

\- Permission-safe payloads.

\- Do not expose private content through notifications.

Important Variant message:

\`\`\`text

Someone created a Variant based on your prompt.

\`\`\`

Do not implement push notifications yet.

**---**

**# Phase 25 — Repository Activity**

Implement repository Activity history.

Show events such as:

\`\`\`text

Repository created

Version published

Variant created

Visibility changed
Evidence added/updated where useful

\`\`\`

Keep activity useful rather than logging every trivial action.

Add Activity tab to repository detail.

Ensure attribution and timestamps are accurate.

**---**

**# Phase 26 — Reporting**

Implement user-generated reports.

Targets:

\`\`\`text

Repository

Comment

User

\`\`\`

Reasons:

\`\`\`text

Spam

Scam

Misleading

Misleading Evidence

Copyright

Harassment

Unsafe Content

Adult Content

Other

\`\`\`

Requirements:

\- Report form.

\- Optional description.

\- Prevent extreme duplicate report spam.

\- Report status.

\- Moderator review queue.

\- Users should not be able to manipulate report status.

Do not automatically remove content based solely on one report.

**---**

**# Phase 27 — Moderation Dashboard**

Implement moderator/admin moderation tools.

Route:

\`\`\`text

/admin/moderation

\`\`\`

Features:

\`\`\`text

Open Reports

Reported Repositories

Reported Comments

Reported Users

Resolved Reports

Hidden Content

Suspended Users

\`\`\`

Actions:

\`\`\`text

Dismiss Report

Resolve Report

Hide Repository

Restore Repository

Hide Comment

Suspend User

Restore User

\`\`\`

Require appropriate role permissions.

Moderators must be able to review evidence images on reported repositories and, where needed, hide/restore a specific evidence image without unnecessarily removing the whole repository.

All moderation actions must be auditable.

**---**

**# Phase 28 — Audit Logging**

Implement security and administrative audit logs.

Record actions such as:

\`\`\`text

PROMPT\_HIDDEN

PROMPT\_RESTORED

COMMENT\_HIDDEN

USER\_SUSPENDED

USER\_RESTORED

ROLE\_CHANGED

REPORT\_RESOLVED

\`\`\`

Store:

\`\`\`text

actor

action

targetType

targetId

timestamp

metadata

\`\`\`

Requirements:

\- Audit records should not be editable through normal application flows.

\- Provide admin-only viewing.

\- Add filtering.

\- Do not leak sensitive secrets into audit metadata.

**---**

**# Phase 29 — Security Hardening**

Perform a dedicated security phase.

Review the entire frontend/backend.

Implement or verify:

\- Helmet/security headers.

\- Strict CORS allowlist.

\- Input validation.

\- Output-safe rendering.

\- Rate limiting.

\- Login throttling.

\- Secure cookies.

\- JWT expiration.

\- Refresh-token rotation.

\- Authorization guards.

\- Ownership checks.

\- Role guards.

\- File-size restrictions.

\- MIME validation.

\- Upload sanitization.

\- CSRF protection where applicable.

\- SQL injection resistance through Prisma.

\- XSS protection.

\- Sensitive-data-safe logging.

\- Secrets only in environment variables.

\- No private repository leakage.

\- No IDOR vulnerabilities.

For evidence uploads specifically verify:

- Maximum 3 images per PromptVersion.
- Maximum 5 MB per image.
- Allow JPEG, PNG, and WebP only.
- Validate MIME type and file signature where practical.
- Reject SVG, HTML, JavaScript, executables, archives, and unknown binary files.
- Sanitize original filenames and generate server-controlled storage keys/public IDs.
- Prevent path traversal.
- Prevent private evidence leakage.
- Rate-limit upload endpoints.
- Never expose Cloudinary API secret to the frontend.

Add security-focused integration tests.

**---**

**# Phase 30 — Seed Content System**

Implement production-safe Vrompt starter content.

Do not create fake humans pretending to be genuine users.

Add account type:

\`\`\`text

REAL

STARTER

OFFICIAL

\`\`\`

Seed:

\- Official categories.

\- Tags.

\- Starter creators.

\- Starter repositories.

\- Versions.

\- Variants.

\- Collections.

Starter accounts must be clearly labeled.

Do not include seeded users in genuine-user growth metrics.

Starter repositories may include genuine example evidence images, still limited to 3 per version. Do not fabricate evidence that appears to represent real-user results.

Create repeatable and safe seed scripts.

**---**

**# Phase 31 — Responsive UX Review**

Perform a system-wide responsive UX review.

Test:

\`\`\`text

Mobile

Tablet

Laptop

Desktop

\`\`\`

Prioritize:

\`\`\`text

Repository Detail

Search

Prompt Editor

Create Variant

Collections

Profile

Authentication

Moderation

\`\`\`

Fix:

\- Overflow.

\- Tiny touch targets.

\- Awkward sidebars.

\- Broken tables.

\- Long prompt text.

\- Modal sizing.

\- Navigation.

\- Forms.

\- Filter UX.

Also test evidence upload, preview, reordering, gallery display, image viewer, and mixed image aspect ratios across phone, tablet, laptop, and desktop.

Tablet usability should receive particular attention.

**---**

**# Phase 32 — Accessibility**

Audit Vrompt for accessibility.

Verify:

\- Semantic HTML.

\- Keyboard navigation.

\- Visible focus.

\- Proper labels.

\- ARIA only where needed.

\- Contrast.

\- Screen reader structure.

\- Accessible dialogs.

\- Accessible dropdowns.

\- Error messages associated with fields.

\- Skip navigation where appropriate.

\- Buttons have understandable accessible names.

\- Copy/Save/Create Variant actions are understandable without icons alone.

Evidence images must support alt text/captions, keyboard-accessible viewing, clear upload labels, and proper focus return after closing the image viewer.

Fix all major accessibility issues discovered.

**---**

**# Phase 33 — Backend Unit Tests**

Build comprehensive backend unit tests.

Cover:

\`\`\`text

Authentication

Authorization

Profiles

Repository Creation

Versioning

Create Variant

Variant Lineage

Copy Metrics

Bookmarks

Likes

Comments

Following

Collections

Search

Notifications

Reporting

Moderation

Audit Logs

Evidence upload/delete/reorder
Evidence version ownership
Cloudinary/local storage abstraction

\`\`\`

Test:

\- Happy paths.

\- Invalid inputs.

\- Unauthorized operations.

\- Ownership restrictions.

\- Duplicate actions.

\- Missing records.

\- Edge cases.

Add explicit tests for:

```text
Upload 1 evidence image
Upload 3 evidence images
Reject 4th image
Reject >5 MB image
Reject unsupported MIME
Reject unauthorized upload
Delete own evidence image
Reject deleting another user's image
Reorder evidence images
Preserve old-version evidence
Variant does not inherit source evidence
```

Do not simply test implementation details; test behavior.

**---**

**# Phase 34 — Integration Tests**

Create integration tests using the real application modules and test database.

Critical scenarios:

\`\`\`text

Register → Login

Create Repository → Publish

Create Version

Copy

Save

Like

Comment

Follow

Create Collection

Create Variant

Variant of Variant

Search Repository

Report Repository

Moderator Review

\`\`\`

Verify database state after each workflow.

Also test:

```text
Create Repository → Upload 3 Evidence Images → Publish → Verify 3 Images
Publish Version 2 → Upload different Evidence → Verify Version 1 unchanged
Create Variant → Verify original Evidence not copied → Upload Variant Evidence
```

Ensure tests clean up after themselves.

**---**

**# Phase 35 — End-to-End Browser Tests**

Implement end-to-end browser tests for the critical Vrompt journey.

Scenario:

\`\`\`text

User A registers

→ completes profile

→ publishes Prompt A

→ publishes Version 2

User B registers

→ searches Prompt A

→ views Prompt A

→ copies it

→ saves it

→ follows User A

→ creates a Variant

→ publishes the Variant

User A

→ receives Variant notification

→ opens Variant

→ sees correct "Based on" attribution

\`\`\`

Also test phone-sized viewport.

Extend the browser journey so User A publishes Prompt A with up to 3 evidence images, then publishes Version 2 with different evidence. Verify Version 1 retains its original evidence. When User B creates a Variant, verify the source evidence is not copied and User B can upload their own evidence. Also test phone-sized evidence upload.

The MVP core cannot be considered complete if this flow fails.

**---**

**# Phase 36 — Production Docker**

**# Phase 36 — Production Docker**

Create production Docker configuration.

Containers:

\`\`\`text

vrompt-nginx

vrompt-web

vrompt-api

vrompt-postgres

vrompt-redis

\`\`\`

Requirements:

\- Multi-stage builds.

\- Small production images.

\- Non-root execution where practical.

\- Health checks.

\- Restart policies.

\- Persistent PostgreSQL volume.

\- Internal database/cache networking.

\- Production environment variables.

\- No dev dependencies unnecessarily running.

\- Graceful application shutdown.

Only Nginx should be internet-facing.

Production Docker must use optimized immutable images with no source-code bind mounts:

```text
Next.js → production build
NestJS → compiled dist production runtime
PostgreSQL → persistent volume
Redis → internal-only
Cloudinary → external evidence storage/CDN
```

Keep separate Compose overlays/configurations for development and production, for example:

```text
docker-compose.yml
docker-compose.dev.yml
docker-compose.prod.yml
```

Development mode must use Next.js hot reload and NestJS watch mode with source bind mounts so normal `.ts`, `.tsx`, and CSS changes apply without rebuilding Docker images. Rebuild only when dependencies, Dockerfiles, OS packages, or relevant container configuration change.

Development evidence storage:

```text
MEDIA_STORAGE_DRIVER=local
LOCAL_MEDIA_ROOT=/app/storage/evidence
```

Mount local evidence storage persistently, for example `./storage/evidence:/app/storage/evidence`, so development uploads survive container restarts.

Production evidence storage:

```text
MEDIA_STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Cloudinary is external and is not a Docker container.

**---**

**# Phase 37 — VPS Production Setup**

Prepare an Ubuntu VPS for Vrompt.

Target approximately:

\`\`\`text

2 vCPU

4 GB RAM

40+ GB storage

\`\`\`

Install/configure:

\- Docker.

\- Docker Compose.

\- Git if required.

\- Non-root sudo user.

\- SSH keys.

\- Firewall.

\- Fail2ban.

\- Automatic security updates.

\- Swap if appropriate.

\- Log rotation.

Expose only necessary ports.

Do not publicly expose PostgreSQL or Redis.

Do not use the VPS filesystem as permanent production storage for evidence images. Temporary upload files, if any, must be cleaned up and protected from disk exhaustion. Production evidence goes to Cloudinary.

Document deployment steps.

**---**

**# Phase 38 — Nginx and HTTPS**

Configure Nginx reverse proxy.

Example:

\`\`\`text

vrompt.com → Next.js

api.vrompt.com → NestJS

\`\`\`

Requirements:

\- HTTP → HTTPS redirect.

\- TLS.

\- Proxy headers.

\- Reasonable body-size limits.

\- API rate limit support where appropriate.

\- Compression.

\- Static caching rules where safe.

\- WebSocket compatibility if needed later.

\- Security headers.

Configure request body limits sufficient for up to 3 × 5 MB evidence uploads while still protecting the server. Do not expose Cloudinary credentials through Nginx or client-side configuration.

Verify SSL renewal mechanism.

**---**

**# Phase 39 — CI/CD**

Create GitHub Actions CI/CD.

Pull request pipeline:

\`\`\`text

Install

→ Lint

→ Type-check

→ Unit Tests

→ Integration Tests

→ Build Web

→ Build API

\`\`\`

Production pipeline:

\`\`\`text

Merge main

→ Build Docker Images

→ Push Images

→ Deploy

→ Run Prisma Migrations

→ Restart Services

→ Health Check

\`\`\`

Requirements:

\- Secrets stored securely.

\- No secrets committed.

\- Deployment failure must be visible.

\- Avoid partially deployed broken versions.

\- Validate required production Cloudinary environment variables during deployment/startup when `MEDIA_STORAGE_DRIVER=cloudinary`. Include evidence upload/storage tests in CI.

Document rollback strategy.

**---**

**# Phase 40 — Backups and Recovery**

Implement production backup strategy.

PostgreSQL:

\`\`\`text

Daily pg\_dump

→ compress

→ store outside the primary VPS

\`\`\`

Suggested retention:

\`\`\`text

7 daily

4 weekly

3 monthly

\`\`\`

Requirements:

\- Automated backup.

\- Backup logging.

\- Failure alert mechanism if practical.

\- Encrypted remote storage.

\- Restore documentation.

\- Perform a real test restore.

Database backups preserve evidence metadata, not Cloudinary objects themselves. Document Cloudinary asset retention/recovery strategy separately so a database restore does not leave broken media references.

Do not consider backups complete until restoration succeeds.

**---**

**# Phase 41 — Monitoring and Health**

Implement basic production monitoring.

Monitor:

\`\`\`text

Web availability

API availability

CPU

RAM

Disk

Database storage

Container health

HTTP 5xx rate

API latency

Failed logins

Backup status

\`\`\`

Add:

\`\`\`text

/health

\`\`\`

with meaningful health checks.

Also monitor evidence upload failures, Cloudinary/storage errors, upload latency, rejected oversized files, rejected file types, and storage-related API failures.

Ensure monitoring cannot expose secrets or sensitive internal data.

**---**

**# Phase 42 — Product Analytics**

Implement privacy-conscious product analytics.

Track useful events:

\`\`\`text

repository\_viewed

prompt\_copied

prompt\_saved

repository\_published

version\_published

variant\_created

search\_performed

collection\_created

collection\_item\_added

creator\_followed

comment\_created

\`\`\`

Prioritize metrics:

\`\`\`text

Prompt Copies

Prompt Saves

Variants Created

Search → Copy Conversion

Returning Users

Weekly Active Creators

Repositories Published

\`\`\`

Separate STARTER/OFFICIAL activity from REAL-user metrics.

Compare copy/save/variant conversion for repositories with evidence versus without evidence, but do not treat evidence count itself as a success metric.

Avoid inflating metrics with seeded activity.

**---**

**# Phase 43 — Internal Alpha**

Prepare Vrompt for internal alpha testing.

Use approximately 5–10 testers.

Do not heavily explain the UI.

Ask testers to naturally:

\`\`\`text

Register

Find a prompt

Copy it

Save it

Publish one

Create a new version

Create a Variant

Create a collection

Search again

\`\`\`

Record:

\- UX confusion.

\- Bugs.

\- Missing validation.

\- Broken mobile behavior.

\- Performance problems.

\- Terminology confusion.

Specifically test whether users understand “Example Results”/evidence, can upload up to 3 images easily, and understand that evidence belongs to a specific prompt version.

Fix critical and high-impact problems before closed beta.

**---**

**# Phase 44 — Closed Beta**

Prepare a controlled closed beta for approximately 25–100 genuine users.

Target users who regularly use AI prompts:

\`\`\`text

Developers

Designers

Students

Researchers

Marketers

Content Creators

AI Power Users

\`\`\`

Requirements:

\- Production stability.

\- Basic support/report channel.

\- Track genuine usage separately from starter content.

\- Monitor server performance.

\- Monitor repository creation.

\- Monitor searches.

\- Monitor copies.

\- Monitor saves.

\- Monitor Variants.

\- Monitor retention.

- Monitor evidence upload success rate.
- Monitor repositories with evidence.
- Monitor evidence gallery views.
- Compare evidence → copy/save/create-variant conversion.

Do not add major Phase 2 functionality during beta unless necessary to fix the core product.

**---**

**# Phase 45 — MVP Validation**

Analyze whether the Vrompt MVP is actually useful.

Answer using real usage data:

\`\`\`text

Can users find useful prompts?

Do users copy prompts?

Do users save prompts?

Do users publish repositories?

Do creators update repositories?

Do people create Variants?

Do people discover Variants?

Do users return?

\`\`\`

Measure:

\`\`\`text

Day 1 Retention

Day 7 Retention

Day 30 Retention

Search → Repository View

Repository View → Copy

Repository View → Save

Repository View → Create Variant

Creator Repeat-Publish Rate

\`\`\`

Do not judge success primarily by account registrations or page views.

Also evaluate whether evidence images improve trust, copy rate, save rate, and Variant creation, while clearly treating them as example results rather than guaranteed proof of identical AI output.

Produce a clear MVP validation report.

**---**

**# Phase 46 — Phase 1 Production Launch**

Perform the final Vrompt Phase 1 release audit.

The following workflow must work reliably:

\`\`\`text

Register

→ Login

→ Create Profile

→ Search Repository

→ View Repository

→ Copy Prompt

→ Save Prompt

→ Publish Repository

→ Publish New Version

→ Create Variant

→ View Variant Lineage

→ Create Collection

→ Follow Creator

→ Comment

→ Receive Notification

→ Report Content

→ Moderator Reviews Report

\`\`\`

Verify:

\- Desktop.

\- Tablet.

\- Mobile.

\- Authentication.

\- Authorization.

\- Search.

\- Repository visibility.

\- Version history.

\- Variant attribution.

\- Backups.

\- Recovery.

\- Monitoring.

\- HTTPS.

\- Docker health.

\- Database migrations.

\- CI/CD.

\- Moderation.

\- Audit logs.

\- Analytics.

\- Accessibility.

\- Security.

Also verify this production media workflow:

```text
Create Prompt
→ Add 1–3 Evidence Images
→ Publish
→ View Example Results
→ Publish Version 2 with different Evidence
→ Verify Version 1 evidence is preserved
→ Create Variant
→ Verify source evidence is not copied
→ Upload Variant evidence
→ Publish
```

Verify development behavior separately:

```text
Docker dev starts once
→ edit Next.js source → hot reload without rebuild
→ edit NestJS source → watch reload without rebuild
→ upload evidence → stored locally
→ restart container → local evidence still exists
```

Verify production behavior separately:

```text
No source bind mounts
Optimized web/api builds
Cloudinary selected
Cloudinary public_id/storage key stored
Optimized evidence thumbnails load
Cloudinary secret never reaches browser
PostgreSQL and Redis are not public
```

Fix launch-blocking issues before release.

Do not implement Phase 2 features as part of this task.

When all acceptance checks pass, consider:

**\*\*Vrompt Phase 1 MVP — Production Ready.\*\***
