# Google Drive File Manager — OpenCode Implementation Prompt

> **Project goal:** Build a professional, secure, responsive Next.js application connected to my Google Drive account. The app must upload, preview, print, download, search, and organize files. Use Neon PostgreSQL for application metadata and settings. I will provide the actual database connection string and Google OAuth values in my local `.env` file.

---

## 1. Role and execution requirements

Act as a Senior Full-Stack Developer, Software Architect, UI/UX Designer, Security Engineer, and QA Engineer.

This is an implementation task, not a mockup.

1. Inspect the existing repository before changing anything.
2. Identify existing framework versions, structure, scripts, dependencies, database, authentication, deployment configuration, and tests.
3. Preserve existing project functionality and data.
4. If this is an existing project, integrate the feature into its architecture without unnecessary rewrites.
5. If this is a new project, create it using the stack below.
6. Create a concise plan, then continue to implementation. Do not stop at planning.
7. Implement the frontend, backend routes/actions, database, Google Drive integration, settings, documentation, and tests.
8. Do not use fake data or mocked success in production functionality.
9. Do not claim a feature or test passed unless it was actually verified.
10. Report blockers honestly and provide exact steps to resolve them.

## 2. Required stack

Use:

- **Next.js** with App Router
- React
- TypeScript
- Tailwind CSS
- Professional reusable UI components
- Next.js server-side routes/actions for backend functionality
- **Neon PostgreSQL** for application data
- Prisma ORM, unless the existing repository already has a suitable ORM/database integration
- Google Drive API v3
- Google OAuth 2.0
- Official Google client libraries where appropriate
- Vercel-compatible deployment

Do not create a separate Laravel backend. Keep Google API calls, OAuth handling, and secrets on the server.

Use the existing stack if this repository already has one and it is suitable; do not destructively replace it.

## 3. Neon PostgreSQL configuration

Use Neon PostgreSQL.

I will put the real connection string in `.env`. The value I mentioned is only a partial connection-string prefix, not a complete URL. Do not invent the missing credentials or connection details.

Use:

```env
DATABASE_URL="postgresql://YOUR_ACTUAL_NEON_CONNECTION_STRING"
```

Configure Prisma or the existing ORM to read `DATABASE_URL` from the environment.

Requirements:

- Database schema and migrations
- Database client and safe connection handling
- Indexes for common queries
- Application settings persistence
- File/folder metadata persistence
- Proper validation and error handling
- Migration and initialization instructions
- No database credentials in client-side code
- No real connection string in source control or `.env.example`

If Neon provides a pooled connection string, use it for application queries where appropriate. Use a direct connection for migrations or operations that require it. Document the required setup.

Do not claim Neon is connected until an actual connection has been tested.

## 4. Environment variables and secrets

Create `.env.example` with placeholders only. Use the exact variable names required by the implementation, including appropriate equivalents of:

```env
DATABASE_URL=""

GOOGLE_ACCOUNT_EMAIL=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI=""
GOOGLE_DRIVE_ROOT_FOLDER_ID=""

NEXT_PUBLIC_APP_URL="http://localhost:3000"

SESSION_SECRET=""
ENCRYPTION_KEY=""
```

Also:

- Create/update `.gitignore` to exclude `.env`, `.env.local`, `.env.*.local`, and other secret-bearing files.
- Never commit real credentials.
- Never expose Google Client Secret, database URL, session secret, encryption key, access tokens, or refresh tokens to the browser.
- Do not print secrets in logs or final reports.
- Do not use Gmail password authentication.
- Do not hardcode tokens.
- Do not place secrets in `NEXT_PUBLIC_*` variables.
- If configuration is missing, show a clear setup state rather than fake success.
- I will manually configure the actual `.env`.

The Google account email is an account identifier, not an authentication credential. OAuth authorization must happen through Google's official consent flow.

## 5. Google Drive integration

Implement a real Google Drive integration using Google Drive API v3 and OAuth 2.0.

The app must:

1. Let me connect my Google account.
2. Redirect to Google's official OAuth consent screen.
3. Request only the scopes required for the app's actual functionality.
4. Handle OAuth callback and authorization-code exchange.
5. Store credentials securely on the server.
6. Refresh access tokens when appropriate.
7. Detect expired, revoked, or missing authorization.
8. Allow disconnect and reconnect.
9. Verify the connected account.
10. Perform actual Drive API operations.

Evaluate the least-privilege scope suitable for the intended files. Explain scope limitations, especially whether the app can manage only app-created files or files across my Drive. Do not request broad access unnecessarily.

Implement real operations:

- List files and folders
- Pagination
- Get file metadata
- Upload files
- Download files
- Create folders
- Rename files/folders
- Move files/folders where supported
- Delete files/folders
- Search files
- Retrieve thumbnails when supported
- Retrieve file content for preview
- Export Google Workspace files to supported formats

Do not simulate Drive. Do not create fake file records that are not in Drive. Do not expose private Drive files via public URLs.

### Dedicated root folder

Prefer a dedicated application folder in Drive, for example:

```text
My Drive
└── File Manager App
    ├── PDF
    ├── Excel
    ├── Documents
    ├── Images
    └── Other Files
```

Allow me to select an existing folder or create a dedicated root folder. The root folder ID must be configured, not invented. Do not move or reorganize existing Drive files without explicit confirmation.

If root folder configuration is missing, show a clear setup flow.

## 6. Main application and dashboard

Create a polished file-management dashboard, not a basic unstyled page.

### Navigation

- Dashboard
- All Files
- PDF Files
- Excel Files
- Word Documents
- Images
- Recent Files
- Favorites
- Trash, if implemented
- Settings

### Main dashboard

Include:

- Page title
- Breadcrumb navigation
- Search
- Upload button
- New Folder button
- File type filters
- Sorting
- Grid/list view switch
- File list
- Upload progress
- Pagination or efficient infinite scrolling

### Real statistics

Show actual counts and storage information when available:

- Total files
- Total folders
- Storage used
- PDF count
- Excel count
- Recent uploads

Do not show fake numbers. Clearly identify unavailable values.

### File cards/list rows

Display:

- File icon or thumbnail
- Name
- Extension
- Size
- Modified date
- Folder
- Available actions

Actions:

- Preview
- Download
- Print when supported
- Rename
- Move
- Delete
- Favorite
- Copy link only if safe and supported

Use a consistent menu for secondary actions.

## 7. Upload system

Implement:

- Single-file upload
- Multiple-file upload
- Drag and drop
- File picker
- Upload to current folder
- Upload to selected folder
- Progress display
- Cancellation where supported
- Retry
- Error handling

Validate on the server:

- File type
- MIME type
- Size
- Empty files
- Filename
- Duplicate names
- Permissions
- Drive limitations

Make maximum size and allowed types configurable in Settings.

Upload flow:

1. Validate input.
2. Verify Google Drive connection.
3. Determine destination folder.
4. Upload the actual file to Google Drive.
5. Receive actual Drive file ID.
6. Retrieve actual metadata.
7. Save application metadata in PostgreSQL.
8. Update UI.
9. Show success only after Drive confirms the operation.

Prevent duplicate metadata records on retry. Do not mark upload successful before Drive confirms it. Handle interruptions and cleanup temporary files.

## 8. PDF preview

Build a proper PDF viewer using a suitable library such as PDF.js.

Features:

- Render pages
- Previous/next
- Page number input
- Zoom in/out
- Fit width
- Fit page
- Fullscreen
- Download
- Print

Preview inside the app without forcing a download.

Use secure server-side file access. Handle large, corrupted, unsupported, and password-protected PDFs gracefully.

## 9. Excel and CSV preview

Support:

- XLS
- XLSX
- CSV

Use a suitable maintained library such as SheetJS.

Features:

- Workbook sheet selection
- Sheet names
- Readable table
- Row and column navigation
- Horizontal and vertical scrolling
- Search within sheet
- Basic sorting where practical
- Adjustable display density/zoom
- Download original
- Print current sheet or selected content where supported

For XLSX:

- Read multiple sheets
- Preserve displayed cell values
- Support basic formatting where practical
- Handle empty cells
- Handle large worksheets efficiently
- Avoid rendering thousands of rows at once

Do not modify the original file for preview. Do not claim full Excel compatibility. Document limitations for formulas, charts, macros, merged cells, and complex formatting.

## 10. Word documents

Support DOCX preview with a suitable library.

Render basic:

- Headings
- Paragraphs
- Tables
- Images
- Lists
- Document formatting

For legacy DOC files or unsupported content, provide a clear fallback such as download or a configured server-side conversion to PDF.

Do not claim full DOC/DOCX compatibility unless tested.

## 11. Image preview

Support JPG, JPEG, PNG, and WEBP.

Features:

- Preview
- Zoom
- Fit to screen
- Fullscreen
- Download
- Print
- Image dimensions and file size when available

## 12. Printing

Printing is a core feature.

### PDF

- Print from PDF viewer
- Preserve page dimensions where possible
- Preserve orientation where possible
- Avoid unnecessary scaling
- Open browser print dialog
- Let user select printer through browser/OS

### Excel

- Print current sheet
- Print selected rows/cells where supported
- Readable table layout
- Orientation
- Margins
- Scaling
- Repeated headers where practical

### Images

- Print selected image
- Appropriate scaling

### General

Create a dedicated print layout. Hide dashboard sidebar, navigation, action buttons, upload controls, and unrelated UI. Show only document content and useful filename/title.

Use CSS print styles.

Do not claim the document printed merely because the browser print dialog opened. Actual printing is controlled by the browser and operating system.

## 13. Download

Implement real downloads.

Verify:

1. Google Drive connection
2. File existence
3. Permission
4. File content retrieval
5. Correct original format
6. Original filename where possible
7. Correct content type
8. Efficient handling of large files

Use streaming where appropriate; avoid unnecessarily loading large files into memory.

For Google Workspace native files, implement supported exports:

- Google Docs → PDF or DOCX
- Google Sheets → XLSX or PDF
- Google Slides → PDF or PPTX

Only offer formats supported by Drive API. Do not silently convert formats.

## 14. File and folder organization

### Folders

- Create
- Rename
- Open
- Move where supported
- Delete
- Breadcrumbs
- Nested navigation

### Files

- Rename
- Move
- Delete
- Download
- Preview
- Print
- Favorite

All operations must affect the real Drive file/folder.

### Search

Search by:

- Name
- Type
- Folder
- Modified date

Use Drive search where appropriate and support pagination.

### Sorting

- Name
- Modified date
- Size
- Type

### Filtering

- PDF
- Excel
- Word
- Images
- Other files

## 15. Settings page — mandatory

Create a real Settings page at:

```text
/settings
```

Settings must persist in PostgreSQL and apply throughout the app. This must not be a static UI mockup.

Separate:

1. Environment/deployment configuration
2. Application settings
3. Google Drive connection
4. User preferences
5. Security configuration

Environment variables are for secrets and deployment configuration. The Settings page is for safe runtime preferences.

Never expose or allow ordinary settings UI to modify:

- Database URL
- Google Client Secret
- Session secret
- Encryption key
- OAuth access/refresh tokens

If an item requires environment configuration, explain that clearly in the UI rather than pretending it can be edited there.

### Settings sections

#### General
- Application name
- Logo
- Default language
- Arabic/English
- RTL/LTR
- Theme
- Default file view
- Default sorting
- Items per page

#### Google Drive
- Connect
- Disconnect
- Reconnect
- Connected account email
- Connection status
- Select/change root folder
- Test connection
- Last successful connection
- Authorization errors
- Permission information

Only show connected status after a real server-side Drive API verification.

#### Upload
- Maximum upload size
- Allowed file types
- Multiple uploads
- Default destination folder
- Duplicate filename behavior
- Unsupported-file behavior
- Retry behavior

Validate these settings on the backend. UI-only validation is insufficient.

#### Preview
- Default PDF zoom
- PDF fit mode
- Excel display mode
- Preview behavior
- Maximum preview size where applicable
- Supported preview types

#### Printing
- Default paper size
- Orientation
- Margins
- Scaling
- Print preferences

Use sensible defaults and respect browser/OS limitations.

#### Storage
- Google Drive root folder
- Default folders
- Folder organization
- Organize by file type
- Organize by upload date

Do not move existing Drive files without explicit user confirmation.

#### Appearance and language
- Arabic/English
- RTL/LTR
- Light/dark
- Application logo/name
- Default view

### Settings behavior

Implement:

- Save
- Cancel
- Reset to defaults where appropriate
- Loading states
- Success/error notifications
- Confirmation dialogs for destructive changes
- Responsive design
- Proper Arabic RTL layout

Settings must survive refresh and application restart.

### Settings database

Use a maintainable schema with fields equivalent to:

- key
- value
- category
- updated timestamp

Use typed validation and safe defaults. Do not store secrets in ordinary settings.

Create migrations and seed/default initialization as needed.

## 16. Database schema

Use PostgreSQL/Neon and Prisma or the existing suitable ORM.

Potential entities:

### User
- id
- email
- createdAt

### GoogleDriveConnection
- id
- userId
- accountEmail
- secure credential reference/encrypted credentials
- rootFolderId
- connectionStatus
- createdAt
- updatedAt

### FileMetadata
- id
- userId
- googleDriveFileId
- name
- mimeType
- size
- parentFolderId
- modifiedTime
- webViewLink only where appropriate
- thumbnailLink only where appropriate
- createdAt
- updatedAt

### FolderMetadata
- id
- googleDriveFolderId
- name
- parentFolderId

### Favorites
- id
- userId
- googleDriveFileId

### ApplicationSettings
- id/key
- value
- category
- updatedAt

Use appropriate indexes and migrations.

Drive remains the source of truth for file content and actual Drive metadata. PostgreSQL stores application metadata/settings. Do not store uploaded file contents in PostgreSQL.

## 17. Security

Implement:

- Server-side OAuth
- Secure session handling
- HttpOnly cookies where appropriate
- CSRF protection where applicable
- Input validation
- File type and size validation
- Secure upload handling
- Authorization checks
- Error sanitization
- Rate limiting where appropriate
- Secure secret management

Never:

- Expose Google Client Secret to frontend
- Put refresh tokens in localStorage
- Commit credentials
- Log secrets
- Make private files public
- Use Gmail password authentication
- Disable OAuth security checks
- Hardcode tokens

## 18. UI/UX

Create a professional SaaS dashboard:

- Clean typography
- Consistent spacing
- Responsive layout
- Light and dark modes
- Accessible controls
- Consistent file icons
- Subtle animations
- Loading, empty, success, and error states
- Confirmation dialogs
- Toast notifications

Support desktop, tablet, and mobile.

Support Arabic and English. Use Arabic as default if no existing preference. Implement real RTL/LTR layouts, not just translated strings. Ensure tables, navigation, dialogs, and forms work correctly in RTL.

Do not use emojis as primary file icons. Use a consistent icon library.

## 19. Error handling

Handle and display useful messages for:

- Drive not connected
- OAuth failed
- Access denied
- Token expired/revoked
- File not found
- File too large
- Unsupported type
- Upload/download/preview failure
- API quota exceeded
- Network loss
- Database unavailable
- Invalid settings

Log technical details server-side without exposing secrets. Do not hide errors or return fake success.

## 20. Testing

Testing is mandatory.

### Unit tests

Test:

- File type detection
- Size validation
- MIME handling
- Filename validation
- Folder logic
- OAuth helpers
- Metadata processing
- Settings validation
- Error handling

### Integration tests

Test:

- OAuth callback
- Drive client initialization
- Upload endpoint
- Download endpoint
- File listing
- Folder creation
- Rename
- Delete
- Database operations
- Settings persistence

Mock Google API calls only in automated tests where appropriate. Do not use mocks to claim real Drive integration passed.

### UI tests

Test:

- Dashboard
- Upload
- File selection
- PDF preview/navigation
- Excel sheet navigation
- Download
- Print action/dialog
- Search
- Folder navigation
- Settings page
- Settings save/reload
- Error states

### Build verification

Run:

- Dependency installation if needed
- TypeScript check
- Lint
- Unit tests
- Integration tests where configured
- Production build

Fix implementation-related failures. Do not disable existing tests to make the build pass.

## 21. Real Google Drive test

Prepare a real integration test using a dedicated test folder and generated files without personal data.

Verify:

1. OAuth authorization works
2. Correct account is connected
3. Root folder is accessible
4. File listing works
5. Test file upload works
6. File exists in Drive
7. Metadata retrieval works
8. Preview works
9. Download works
10. Download matches original where applicable
11. Print dialog can be opened
12. Rename works
13. Move works if supported
14. Delete test file works

Use a multi-page PDF and an Excel workbook with multiple sheets.

Clean up only the test files created by the test.

Never delete existing user files.

If credentials or OAuth approval are missing, mark real integration tests as **BLOCKED**, not PASS. Explain exactly what I need to configure.

## 22. Google Cloud setup documentation

Create:

```text
GOOGLE_DRIVE_SETUP.md
```

Explain:

1. Create/select Google Cloud project
2. Enable Google Drive API
3. Configure OAuth consent screen
4. Create OAuth web client credentials
5. Configure authorized redirect URI
6. Set Client ID and Client Secret
7. Connect my Google account
8. Select/create Drive folder
9. Test connection
10. Disconnect/reconnect
11. Troubleshoot OAuth
12. Configure development and production

Document test-user configuration if required.

Never ask for Gmail password.

## 23. README and deployment

Create/update `README.md` with:

- Project overview
- Architecture
- Prerequisites
- Environment variables
- Neon setup
- Google Cloud/OAuth setup
- Database migrations
- Development commands
- Testing commands
- Production build
- Vercel deployment
- Troubleshooting

Provide exact commands based on the actual project scripts.

Make the application compatible with Vercel. Do not depend on persistent local disk for permanent files. Temporary files must be cleaned up securely.

## 24. Final deliverables

Deliver:

1. Complete working Next.js application
2. Professional UI
3. Google Drive OAuth/API integration
4. Upload system
5. PDF preview
6. Excel/CSV preview
7. Word preview where supported
8. Image preview
9. Printing
10. Downloading
11. File/folder management
12. Real Settings page
13. Neon PostgreSQL integration
14. Prisma schema/migrations if applicable
15. `.env.example`
16. `.gitignore`
17. `GOOGLE_DRIVE_SETUP.md`
18. `README.md`
19. Unit tests
20. Integration tests
21. UI tests where practical
22. Actual test report

## 25. Final report

Provide a detailed report.

### A. Implemented features
List implemented features and their routes.

### B. Architecture
Explain Next.js, server routes/actions, Neon, ORM, and Google Drive integration.

### C. Google Drive
Explain OAuth, scopes, token storage, account connection, root folder, and API operations.

### D. Database
Explain schema, migrations, and connection status.

### E. Settings
List settings sections and confirm which are persisted and applied.

### F. Testing results

Use actual statuses:

| Test | Status | Evidence |
|---|---|---|
| Production build | | |
| TypeScript | | |
| Lint | | |
| Unit tests | | |
| Database connection | | |
| Migrations | | |
| OAuth | | |
| Google Drive connection | | |
| Upload | | |
| PDF preview | | |
| Excel preview | | |
| Download | | |
| Print dialog | | |
| Rename | | |
| Delete | | |
| Settings persistence | | |

Use PASS, FAIL, BLOCKED, or NOT TESTED. Never mark a test PASS without executing it.

### G. Required user configuration
List exactly what I need to provide, such as:

- Actual Neon `DATABASE_URL`
- Google account email
- Google OAuth Client ID
- Google OAuth Client Secret
- OAuth redirect URI configuration
- Drive root folder ID if needed
- Production URL

Do not request Gmail password.

### H. Remaining issues
List every unfinished feature, reason, required configuration, and next step.

## 26. Execution rules

Start by inspecting the repository.

Then implement the complete application.

Do not stop at the plan, UI, or API stubs.

Do not claim Neon is connected until a real database connection succeeds.

Do not claim Google Drive is connected until OAuth and an actual API request succeed.

Do not claim tests passed unless they ran.

Do not expose credentials.

Do not delete existing project functionality or user files.

If credentials are unavailable, implement the integration and setup documentation, then report real integration tests as BLOCKED until I complete OAuth/database configuration.

**Final goal:** A secure, professional, usable Next.js file manager connected to my Google Drive, with Neon PostgreSQL, a persistent Settings page, upload, preview, print, download, and file organization.
