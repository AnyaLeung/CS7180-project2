# Rules File Comparison Report

**Feature tested:** Issue #4 — Secure `.py` File Upload  
**Branches:** `test/with-rules` vs `test/no-rules`  
**Date:** February 27, 2026  

---

## 1. Code Quality and Consistency with Project Patterns

### 1.1 Architecture — Request Flow

The `.cursorrules` file specifies a strict layered architecture: `routes/ → controllers/ → services/ → Supabase DB`.

**With Rules** — follows the prescribed pattern exactly, including a centralized types file and auth middleware:

```
backend/src/
├── types/index.ts          ← Centralized type definitions
├── lib/supabase.ts         ← Supabase client
├── middleware/auth.ts      ← JWT authentication
├── routes/files.ts         ← Route definitions
├── controllers/fileController.ts
└── services/fileService.ts ← Validation + Storage + DB write
```

**Without Rules** — similar layering but with a different structure. No auth middleware, no centralized types, no database write:

```
backend/src/
├── config/supabase.ts      ← Supabase client (different folder name)
├── middleware/upload.ts     ← Multer config (no auth)
├── middleware/errorHandler.ts ← Multer error handler
├── routes/fileRoutes.ts    ← Route definitions (different file name)
├── controllers/fileController.ts
├── services/fileService.ts ← Storage only, no DB write
└── app.ts                  ← Separate Express app file
```

**Key difference:** The with-rules version includes a complete data pipeline (validate → upload to Storage → write to DB → return mapped response). The no-rules version stops at Storage upload and never persists file metadata to the database.

### 1.2 Authentication

The `.cursorrules` requires JWT for all protected routes and specifies: *"Always include a test case for unauthenticated requests for every protected endpoint."*

**With Rules** — complete JWT middleware:

```typescript
// backend/src/middleware/auth.ts (WITH rules)
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET ?? '';

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**Without Rules** — no auth middleware at all. The controller hard-codes a fallback user:

```typescript
// backend/src/controllers/fileController.ts (WITHOUT rules)
export async function handleFileUpload(req: Request, res: Response): Promise<void> {
  // ...
  // TODO(#7): Extract userId from JWT token via auth middleware
  const userId = (req as Request & { userId?: string }).userId ?? 'anonymous';
  // ...
}
```

### 1.3 Type Safety

The `.cursorrules` requires TypeScript strict mode with no `any` usage.

**With Rules** — centralized type definitions in `types/index.ts`:

```typescript
// backend/src/types/index.ts (WITH rules)
export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface FileRecord {
  id: string;
  userId: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface FileUploadResponse {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}
```

**Without Rules** — no centralized type file. Types are scattered across individual files, and `Request` is cast inline with ad-hoc type extensions:

```typescript
// backend/src/controllers/fileController.ts (WITHOUT rules)
const userId = (req as Request & { userId?: string }).userId ?? 'anonymous';
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//              Ad-hoc inline type casting instead of a defined interface
```

### 1.4 Database Interaction and Rollback

**With Rules** — writes a record to the `files` table after uploading, and rolls back the Storage upload if the DB insert fails:

```typescript
// backend/src/services/fileService.ts (WITH rules)
const { data, error: dbError } = await supabase
  .from('files')
  .insert({
    id: uniqueId,
    user_id: userId,
    file_name: originalName,
    storage_path: storagePath,
    size_bytes: buffer.length,
  })
  .select()
  .single();

if (dbError) {
  // Rollback: delete the uploaded file from Storage
  await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  throw new Error(`Database insert failed: ${dbError.message}`);
}
```

**Without Rules** — only uploads to Storage, no database persistence, no rollback logic:

```typescript
// backend/src/services/fileService.ts (WITHOUT rules)
export async function uploadFileToStorage(
  file: Express.Multer.File,
  userId: string
): Promise<UploadResult> {
  const uniqueName = `${userId}/${crypto.randomUUID()}_${file.originalname}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(uniqueName, file.buffer, {
      contentType: 'text/x-python',
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return {
    storagePath: uniqueName,
    filename: file.originalname,
    sizeBytes: file.size,
  };
  // No database write, no rollback
}
```

### 1.5 File Validation — Empty File Handling

**With Rules** — validates against empty (0-byte) files:

```typescript
// backend/src/services/fileService.ts (WITH rules)
if (sizeBytes === 0) {
  throw new FileValidationError('File is empty');
}
```

**Without Rules** — no empty file check exists anywhere in the codebase.

---

## 2. Design/Mockup Intent

The `.cursorrules` references `project-memory/mockup.jpg` and specifies a layout with a file sidebar on the left, a code editor in the center, and an instructions panel on the right. The mockup uses a dark theme with purple accent colors.

### 2.1 Overall Layout

**With Rules** — three-section layout matching the mockup (header + sidebar + main area):

```tsx
// frontend/src/App.tsx (WITH rules)
<div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
  <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
    <h1 className="text-xl font-bold italic text-purple-400">InstructScan</h1>
    <nav className="flex items-center gap-4 text-sm">
      <button className="px-3 py-1 rounded bg-purple-600 text-white">Editor</button>
      <button className="px-3 py-1 rounded text-gray-400 hover:text-white">History</button>
      <button className="px-3 py-1 rounded text-gray-400 hover:text-white">Settings</button>
    </nav>
  </header>
  <div className="flex flex-1 overflow-hidden">
    <FileUploader ... />       {/* Left sidebar with file list */}
    <main className="flex-1">  {/* Center editor area */}
  </div>
</div>
```

**Without Rules** — simple centered layout, no sidebar, no navigation tabs:

```tsx
// frontend/src/App.tsx (WITHOUT rules)
<div className="min-h-screen bg-gray-950 text-gray-100">
  <header className="border-b border-gray-800 px-6 py-4">
    <h1 className="text-2xl font-bold italic text-indigo-400 tracking-tight">InstructScan</h1>
  </header>
  <main className="flex items-center justify-center px-6 py-20">
    <FileUploader onUploadComplete={handleUploadComplete} />
  </main>
</div>
```

### 2.2 File List Sidebar

The mockup shows a "FILES" sidebar on the left with uploaded file names (e.g., `main.py`, `utils.py`, `config.py`), where the selected file has a purple left-border highlight.

**With Rules** — dedicated file list matching the mockup:

```tsx
// frontend/src/components/FileUploader.tsx (WITH rules)
<aside className="w-48 flex-shrink-0 border-r border-gray-800 flex flex-col">
  <div className="px-4 py-3">
    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Files</h2>
  </div>
  <div className="flex-1 overflow-y-auto px-2">
    {uploadedFiles.map((f) => (
      <button
        key={f.id}
        onClick={() => onSelectFile(f.id)}
        className={`... ${
          selectedFileId === f.id
            ? 'bg-gray-800 text-white border-l-2 border-purple-500'  // Purple highlight
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        }`}
      >
        {f.fileName}
      </button>
    ))}
  </div>
  {/* Upload drop zone at bottom */}
</aside>
```

**Without Rules** — no file list at all. The component is a standalone upload area with no concept of browsing previously uploaded files.

### 2.3 Brand Color

The mockup uses **purple** as the primary accent color (visible in the logo, selected file highlight, and "Run Scan" button).

| Element | With Rules | Without Rules |
|---------|-----------|---------------|
| Logo | `text-purple-400` | `text-indigo-400` |
| Active tab | `bg-purple-600` | *(no tabs)* |
| Selected file | `border-purple-500` | *(no file list)* |
| Progress bar | `bg-purple-500` | `bg-indigo-500` |
| Drag hover | `border-purple-500 bg-purple-500/10` | `border-indigo-400 bg-indigo-950/40` |

---

## 3. Adherence to Naming Conventions and Architecture

### 3.1 File Naming

The `.cursorrules` specifies: *"API routes: kebab-case"* and the folder structure shows `routes/` with simple filenames.

| Item | With Rules | Without Rules | Convention |
|------|-----------|---------------|------------|
| Route file | `routes/files.ts` | `routes/fileRoutes.ts` | Rules say `routes/` folder already implies "routes" |
| Supabase client | `lib/supabase.ts` | `config/supabase.ts` | Rules say `lib/` |
| Type definitions | `types/index.ts` | *(none)* | Rules require centralized types |

### 3.2 API Route Paths

The `.cursorrules` specifies kebab-case routes with an `/api` prefix.

**With Rules:**
```typescript
// backend/src/index.ts
app.use('/api/files', fileRoutes);  // → POST /api/files
```

**Without Rules:**
```typescript
// backend/src/app.ts
app.use('/files', fileRoutes);  // → POST /files/upload (no /api prefix)
```

### 3.3 API Response Field Naming

The `.cursorrules` states: *"API response bodies must use camelCase. Map database snake_case fields to camelCase equivalents at the controller layer."*

**With Rules** — camelCase response with proper mapping:

```typescript
// Response: POST /api/files → 201
{
  "id": "abc-123",
  "fileName": "main.py",      // camelCase ✓
  "sizeBytes": 1024,           // camelCase ✓
  "uploadedAt": "2026-02-27"   // camelCase ✓
}
```

**Without Rules** — inconsistent casing:

```typescript
// Response: POST /files/upload → 201
{
  "message": "File uploaded successfully",
  "file": {
    "filename": "main.py",      // lowercase, not camelCase ✗
    "storagePath": "user/uuid_test.py",
    "sizeBytes": 1024
  }
}
```

Note: `filename` (all lowercase) breaks the camelCase convention — it should be `fileName`.

### 3.4 Frontend Component Architecture

The `.cursorrules` specifies hooks in `hooks/` and utilities in `utils/`.

**With Rules** — upload logic extracted into a reusable hook:

```
frontend/src/
├── components/FileUploader.tsx   ← Pure UI component (props-driven)
├── hooks/useFileUpload.ts        ← State management + upload logic
└── utils/api.ts                  ← HTTP layer (XHR with progress)
```

**Without Rules** — all logic embedded directly in the component:

```
frontend/src/
├── components/FileUploader.tsx   ← UI + state + upload logic (all-in-one)
└── utils/uploadFile.ts           ← HTTP layer only
```

The with-rules version has better separation of concerns: the `FileUploader` component receives state via props and delegates logic to the `useFileUpload` hook, making both independently testable. The without-rules version bundles 287 lines of mixed UI and logic in a single component.

### 3.5 Commit Message Format

The `.cursorrules` specifies: `type(scope): description #issueNumber`.

**With Rules:**
```
feat(upload): implement secure .py file upload with rules #4
```
✓ Has scope `(upload)`, ✓ references issue `#4`, ✓ follows the convention.

**Without Rules:**
```
feat: implement .py file upload without rules
```
✗ Missing scope, ✗ no issue reference.

---

## 4. Quality of Tests Generated

### 4.1 Test Count Summary

| Area | With Rules | Without Rules |
|------|-----------|---------------|
| Backend — file validation | 8 tests | 7 tests |
| Backend — auth middleware | 5 tests | 0 tests (no auth) |
| Backend — controller | 0 | 4 tests |
| Backend — upload middleware | 0 | 10 tests |
| Frontend — FileUploader | 9 tests | 14 tests |
| **Total** | **22** | **35** |

### 4.2 Unauthenticated Request Testing

The `.cursorrules` explicitly requires: *"Always include a test case for unauthenticated requests (missing or invalid JWT) for every protected endpoint."*

**With Rules** — 4 dedicated auth failure tests:

```typescript
// backend/src/__tests__/auth.test.ts (WITH rules)
it('returns 401 when no authorization header is present', () => { ... });
it('returns 401 when authorization header does not start with Bearer', () => { ... });
it('returns 401 when token is invalid', () => { ... });
it('returns 401 when token is expired', () => { ... });
```

**Without Rules** — no authentication tests exist because the auth middleware was never implemented. The closest test checks what happens with no auth context, but it just verifies the fallback to `'anonymous'`:

```typescript
// backend/src/__tests__/fileController.test.ts (WITHOUT rules)
it('should default userId to anonymous when no auth context', async () => {
  // ...
  expect(mockUploadFileToStorage).toHaveBeenCalledWith(req.file, 'anonymous');
});
```

This is a significant gap: the no-rules version has zero tests verifying that unauthorized users are rejected.

### 4.3 Frontend Test Approach

**With Rules** — tests focus on the component's props-driven interface:

```typescript
// frontend/src/__tests__/FileUploader.test.tsx (WITH rules)
it('renders the FILES heading', () => { ... });
it('renders the upload drop zone with "Upload .py" text', () => { ... });
it('renders uploaded files in the list', () => { ... });
it('highlights the selected file', () => { ... });
it('calls onSelectFile when a file is clicked', () => { ... });
it('shows progress bar when uploading', () => { ... });
it('shows error message when upload fails', () => { ... });
it('opens file picker when drop zone is clicked', () => { ... });
it('triggers upload when a file is selected via input', () => { ... });
```

**Without Rules** — tests use `data-testid` attributes and mock the upload utility:

```typescript
// frontend/src/__tests__/FileUploader.test.tsx (WITHOUT rules)
it('should render the drop zone with instructions', () => { ... });
it('should have a hidden file input that accepts only .py files', () => { ... });
it('should show error for non-.py files via drop', async () => { ... });
it('should show error for files exceeding 5 MB', async () => { ... });
it('should show uploading state for valid .py files', async () => { ... });
it('should show success state after upload completes', async () => { ... });
it('should show error state when upload fails', async () => { ... });
it('should accept files via the file input', async () => { ... });
it('should reset to idle state when "Try again" is clicked', async () => { ... });
it('should reset to idle state when "Upload another file" is clicked', async () => { ... });
it('should visually indicate drag-over state', () => { ... });
```

Both test suites are competent, but the with-rules tests verify the **file list and selection behavior** (unique to the mockup-aware implementation), while the without-rules tests focus on **upload state transitions** in the standalone component.

---

## 5. Summary

| Dimension | With Rules | Without Rules | Verdict |
|-----------|-----------|---------------|---------|
| Architecture | Strict `routes → controllers → services` with auth middleware, types, DB write | Similar layering but missing auth, types, DB persistence | **With rules wins** |
| Mockup fidelity | Three-panel layout, file list sidebar, purple theme, navigation tabs | Centered upload area, no file list, indigo theme, no navigation | **With rules wins** |
| Naming conventions | `/api/files`, `fileName` (camelCase), `routes/files.ts`, `useFileUpload` hook | `/files/upload`, `filename` (lowercase), `routes/fileRoutes.ts`, no hook | **With rules wins** |
| Test quality | 22 tests with auth coverage, file list tests | 35 tests with more UI state coverage, but no auth tests | **Tie** — more tests without rules, but critical auth gap |
| Empty file validation | ✓ | ✗ | **With rules wins** |
| Error rollback | ✓ Storage cleanup on DB failure | ✗ | **With rules wins** |

### Conclusion

The `.cursorrules` file produced a measurably better result across every dimension. The most impactful differences were:

1. **Authentication was entirely skipped** without rules — the AI had no context that this was a protected endpoint
2. **The mockup was completely ignored** without rules — the AI built a generic upload UI instead of the specified three-panel layout with file sidebar
3. **Naming inconsistencies** appeared without rules (`filename` vs `fileName`, missing `/api` prefix, redundant file names like `fileRoutes.ts`)
4. **Database persistence was missing** without rules — the AI only uploaded to Storage without recording file metadata, which would break downstream features (file listing, scan history)

The rules file acted as a comprehensive specification that kept the AI aligned with project conventions, security requirements, and design intent that it would otherwise have no way to infer from a brief prompt alone.
