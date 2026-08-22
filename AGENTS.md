# Project Agent Rules

## Session Role

- Before making edits, the user should declare `Role: Core` or `Role: Vibe` for the session.
- If no role is declared, ask for the role before editing. Read-only inspection may continue while waiting.
- `Role: Core` sessions follow all project rules but do not receive role-based protected-path warnings.
- `Role: Vibe` sessions may work throughout the project, but changes to protected paths or privileged server behavior require a warning and explicit confirmation before editing.

## Vibe Protected-Path Warnings

For a `Role: Vibe` session, warn before modifying any of these paths:

- `AGENTS.md`
- `.env*`
- `package.json` and `pnpm-lock.yaml`
- `prisma/**` and `prisma.config.ts`
- `src/generated/**`
- `src/app/api/**`
- `src/actions/**`
- `src/services/**`
- `src/app/layout.tsx`
- `src/app/login/**`
- `src/lib/prisma.ts`
- `src/lib/auth*.ts`
- `src/lib/storage/**`
- `src/lib/realtime/**`
- `src/components/auth/**`
- `src/components/providers/**`
- `next.config.*`, `tsconfig.json`, `eslint.config.*`, and `postcss.config.*`

Also warn before adding or changing a Server Action or any file containing the `"use server"` directive, regardless of its path.

Use this warning format:

> **Vibe protected-path warning:** This change modifies `<path or privileged behavior>`. The risk is `<specific risk>`. Do you want me to proceed?

- Raise the warning before editing, not after.
- Do not modify the protected path or privileged behavior until the user explicitly confirms.
- Confirmation applies only to the named path or behavior for the current task.
- All unlisted paths remain subject to the normal project rules but do not require a role-based warning.

## Version-Specific Guidance

- Before suggesting or applying code, inspect `package.json` and verify the installed versions of all relevant libraries.
- When `package.json` declares a version range, use `pnpm-lock.yaml` or the installed package's `package.json` as the source of truth for the exact version.
- Use APIs, conventions, and patterns that match the installed versions. Do not assume behavior from older or newer releases.
- Read relevant local version-specific documentation before implementing changes. For Next.js, use the guides in `node_modules/next/dist/docs/`.
- If an API remains uncertain after inspecting the project and local documentation, ask before implementing when the uncertainty could materially change the solution.

Pay special attention to:

- Next.js App Router conventions and the installed Next.js 16 APIs.
- React 19 behavior and Server/Client Component boundaries.
- Prisma 7 schema syntax, generated-client usage, and PostgreSQL driver-adapter configuration.
- Better Auth and its Prisma adapter APIs and model configuration.
- Tailwind CSS 4 and `@tailwindcss/postcss` configuration.
- Ably 2 server and React APIs.
- AWS SDK v3 S3 client and request-presigner APIs used with Cloudflare R2.

## Repository Map

- `src/app` contains App Router pages, layouts, and Route Handlers.
- `src/actions` contains flat, domain-specific Server Action modules.
- `src/components` contains UI components and application providers.
- `src/lib` contains authentication, Prisma, storage, and realtime integrations.
- `src/services` contains flat, domain-specific server-only service modules.
- `src/types` contains shared application types used across multiple folders. Keep component props and local helper types colocated with their implementation.
- `prisma/schema.prisma` is the database schema.
- `src/generated/prisma` is generated code. Never edit it manually; regenerate it from the schema.
- `public` contains static assets.
- When repository documentation conflicts with installed packages, the schema, or active source code, verify the current implementation and report the stale documentation instead of following it blindly.

## Actions and Services

- Use a flat `src/actions` and `src/services` layout. Prefer domain-specific files such as `src/actions/track-actions.ts`, `src/actions/music-actions.ts`, `src/services/track-service.ts`, and `src/services/music-service.ts`.
- Export top-level async functions from domain action modules and import them as module namespaces at frontend call sites so the server boundary is explicit, for example `import * as TrackActions from "@/actions/track-actions"` followed by `TrackActions.createNew(...)`, `TrackActions.saveDetails(...)`, or `MusicActions.prepareUpload(...)`.
- Every file in `src/actions` must use the `"use server"` directive and expose Server Actions for UI-initiated application workflows.
- Actions are boundary and orchestration code. They may verify the Better Auth session, validate client input, compose multiple services or third-party clients, translate known failures to user-safe responses, and return action results.
- Actions must return `ActionResult<T>` from `src/lib/actions` for expected outcomes. Use `actionSuccess` and `actionFailure`; return `{ ok: true, data }` on success and `{ ok: false, error }` on expected failure. Use `null` as success data when there is no payload.
- Keep action return payloads serializable and minimal. Do not return raw Prisma records, provider responses, secrets, storage object keys, presigned URLs beyond the intended upload response, stack traces, or internal error messages.
- Services do the heavy lifting: database reads and writes, storage/realtime/provider operations, reusable domain rules, and cross-action business logic.
- Every service module must be server-only. Add `import "server-only";` at the top of service files that touch the database, secrets, privileged provider clients, or server-only integrations.
- Services should not return `ActionResult<T>`. Return domain data for success and throw typed service errors for expected domain failures that actions can translate.
- Services must remain domain specific. Prefer `TrackService`, `MusicService`, `GroupService`, `StorageService`, and `RealtimeService` style modules over catch-all utility services.
- Service functions that access user-owned or group-owned data must accept the verified acting user or membership context from the action and enforce ownership or role scope in the database query. Do not rely on frontend visibility or page-level checks.
- Route Handlers under `src/app/api/**` are public HTTP boundaries and may call services directly. Do not route external webhooks or protocol endpoints through Server Actions.
- During migration, avoid big-bang moves. Refactor one domain at a time, preserve exported behavior, update imports mechanically, and run the relevant verification commands.

## Groups Domain

- A group represents a band or music group and is a user-selectable application context.
- Users can belong to multiple groups through `GroupMembership`; group membership is the source of group access.
- Every membership has a Prisma `GroupRole`: `OWNER`, `MODERATOR`, or `MEMBER`.
- Creating a group must atomically create the creator's `OWNER` membership.
- Role permission descriptions may be mapped in the frontend, but frontend descriptions are not an authorization boundary. Every group-scoped backend operation must derive the acting user from the verified session, load that user's membership, and enforce the required role permissions server-side.
- Until granular permissions are persisted, roles are fixed: owners control the group and membership roles, moderators manage group content and ordinary members, and members access and contribute group content. Ownership transfer, invitations, member management, and current-group persistence are future work unless a task explicitly includes them.

## Code Style

- Write simple, readable, production-quality code.
- Use strict TypeScript and avoid `any`.
- Prefer explicit types for exported functions, public APIs, hooks, and shared utilities.
- Prefer the simplest implementation that solves the current task while leaving clear room for future expansion.
- Do not over-engineer.
- Do not introduce abstractions unless they clearly reduce duplication or improve structure.
- Follow existing project patterns before creating new ones.
- Keep components small and focused.
- Keep business logic out of UI components when reasonable.
- Prefer readable names over short or clever names.
- Avoid deeply nested logic and prefer early returns.
- Keep file organization consistent with the existing structure.
- Do not add code comments unless explicitly requested.

## Product UI Style

- Match the current home page direction before introducing new visual language.
- Use `#ed1746` as the primary brand accent, with neutral white, near-black, gray, and zinc-like surfaces.
- Support light and dark mode in every new page and shared component. Always define both normal and `dark:` states for surfaces, borders, text, hover states, focus states, and empty states.
- Keep the product UI compact, polished, and music-tool focused. Prefer functional layouts over marketing-style sections for authenticated workflows.
- Use full-width app layouts for authenticated product surfaces. Favor a Spotify-like structure: top navigation, left library panel, primary main-content panel, and a bottom footer strip for ads, notices, or status.
- Do not cap app-shell width with `max-w-*` containers. The app shell, top navigation, left panel, main panel, and footer strip should use the full viewport width.
- Top navigation should put the brand, home button, and rounded search input on the left, with install app, sign up, and log in actions on the right when applicable.
- Main content wrappers belong under `src/components/main/`. Start with `Dashboard` for the primary app panel and add future wrappers there.
- Use responsive layouts by default. Components must work at mobile, tablet, and desktop widths without clipped text, overlapping controls, or inaccessible actions.
- Use rounded pills for primary actions and filters when they match the existing home page. Use cards only for repeated content items or contained tools, not for nested page sections.
- Preserve strong focus-visible styles and readable contrast in both themes.
- Prefer existing spacing, border, and typography patterns from `src/components/landing/landing-page.tsx` until a formal design system exists.

## Change Scope

- Make the smallest safe change that solves the task.
- Do not change unrelated files.
- Do not rename files, folders, functions, types, or variables unless necessary for the requested change.
- Do not rewrite large areas of code unless explicitly requested.

## Dependencies

- Use `pnpm`. Do not introduce another package manager or lockfile.
- Prefer existing dependencies and platform APIs before adding a package.
- Ask before adding a production dependency.
- When a dependency change is authorized, update `package.json` and `pnpm-lock.yaml` together.

## Git and Workspace Safety

- Inspect the working tree before editing and preserve pre-existing user changes.
- Do not revert or overwrite unrelated modifications.
- Do not commit, push, create or delete branches, or rewrite Git history unless explicitly requested.
- Review the final diff and confirm it contains only changes required by the task.

## Prisma / Database

- Use the generated Prisma client through the existing client in `src/lib/prisma.ts` for database reads and writes.
- Do not use `$queryRaw`, `$executeRaw`, or their unsafe variants for normal application logic.
- Use raw SQL only when Prisma cannot express the required operation, and ask before adding it unless raw SQL was explicitly requested.
- Do not create database migrations unless explicitly requested.
- Update `prisma/schema.prisma` only when the task explicitly requires it. A requested schema update does not authorize creating migration files.
- After changing `prisma/schema.prisma`, regenerate the Prisma client when application code needs the new or changed schema types.
- Minimize transferred data and database calls because the PostgreSQL database is cloud-hosted and affects latency, reliability, and cost.
- Prefer `select` with the exact required fields over broad `include` operations or full-record fetches. Load relations only when the current flow needs them.
- Use `Promise.all` for independent reads, `updateMany` for grouped identical updates, `createMany` for batches, and database aggregate or count queries instead of loading rows for in-memory calculations when correctness is preserved.
- Avoid N+1 queries and per-row database loops when a bounded grouped query provides the same correctness.
- For filtering or candidate selection, fetch only the fields needed to qualify records, then fetch heavier relations or payloads after selecting a record for deeper processing.
- Do not load full collections to compute a single summary, rank, count, or existence check. Prefer targeted `count`, `aggregate`, `findFirst`, or narrowed queries.
- Group identical persistence operations where possible and write values together when doing so is safe.
- Keep transactions short. Do not place expensive computation, compression, remote calls, or avoidable reads inside a transaction.
- Do not sacrifice correctness, idempotency, accounting accuracy, or race-condition safety to reduce query count. Call out the tradeoff before making an optimization that changes those guarantees.

## Next.js / React

- Follow the App Router structure under `src/app` and the installed Next.js documentation.
- Respect Server and Client Component boundaries.
- Add `"use client"` only when browser APIs, client-side state, effects, event handlers, or client-only libraries require it.
- Prefer Server Components by default.
- Prefer Server Actions for application-internal mutations, form submissions, and operations initiated by this Next.js application.
- Use Route Handlers only for public HTTP endpoints that must be called directly by external clients or services, including webhooks, callbacks, and protocol-required endpoints. Public endpoints may still require authentication or signature verification.
- Treat every Server Action as an independently reachable, untrusted entry point.
- Every Server Action must verify the current Better Auth session before processing input or performing work. Do not rely on page-level authentication, hidden UI, middleware, or the calling component as an authentication boundary.
- Derive the acting user and owner identifiers from the verified session, never from client-provided input.
- Scope resource reads and mutations to the authenticated user where ownership applies. Add broader role and permission checks when the permission model is implemented.
- Validate all Server Action inputs and return only the minimal data required by the caller.
- Keep Server Actions thin and delegate database, storage, and business logic to existing `server-only` services.
- Keep secrets, signing credentials, storage credentials, and privileged validation on the server.
- Avoid unnecessary global state.
- Reuse the existing providers and application structure.

## Security and Sensitive Data

- Never print, log, commit, or expose values from `.env` or other secret-bearing files. Use `.env.example` to inspect required variable names.
- Treat OAuth tokens, session tokens, API keys, presigned upload URLs, database URLs, and storage credentials as sensitive.
- Keep secrets, privileged operations, and authorization checks in server-only code.
- Preserve authentication and authorization checks in Route Handlers and server-side flows.
- Validate client-controlled filenames, content types, file sizes, storage paths, and request payloads before using them.
- Do not weaken security controls to simplify implementation or testing.

## Error Handling

- Distinguish expected operational failures from unexpected programming or infrastructure errors.
- Handle expected failures close to the boundary that can make a useful decision. Let unexpected errors propagate to the framework or the established top-level handler.
- Catch an error only to recover, add safe context, translate a known error, perform cleanup, or enforce a boundary contract. Do not use empty catch blocks or silently ignore failures.
- Treat caught values as `unknown` and narrow them safely. Do not assume every thrown value is an `Error`.
- Prefer stable typed error codes or error classes for behavior. Do not identify errors by matching human-readable message text.
- Preserve the original error as `cause` when wrapping it on the server, unless doing so would cross a serialization or trust boundary.
- Keep internal diagnostics in server logs and public messages at the client boundary. Never log secrets, credentials, tokens, presigned URLs, full request bodies, or unnecessary personal data.
- Log unexpected errors once at the boundary that owns reporting. Include only useful safe context, and avoid duplicate logging at every layer.
- Fail closed for authentication, authorization, signature verification, ownership checks, and other security decisions.
- Retry only known transient and idempotent operations. Keep retries bounded and do not retry validation, authentication, authorization, or other permanent failures.
- Use `finally` or an equivalent scoped cleanup mechanism when resources must be released regardless of success or failure.
- Do not leave partial database or storage state after a handled failure. Use existing transaction, idempotency, and status-tracking patterns where the operation requires them.

## Server Action Responses

- Return `ActionResult<T>` from `src/lib/actions` for expected Server Action outcomes.
- Return `{ ok: true, data }` for success and `{ ok: false, error }` for expected failures. Use `null` as the success data when an action has no payload.
- Use `actionSuccess` and `actionFailure` to construct results consistently.
- Use stable error codes for frontend behavior. Do not make frontend logic depend on error-message text.
- Convert known validation, authentication, authorization, conflict, not-found, rate-limit, and service-availability failures to concise user-safe messages before returning them.
- Never return raw exception messages, stack traces, Prisma errors, provider responses, storage details, object keys, or other internal context to the frontend.
- Include `fieldErrors` only for validation failures and use field names that are safe for the frontend to display.
- Use an opaque `incidentId` when a safely handled operational failure needs to be correlated with server logs. Do not include sensitive data in logs.
- Throw unexpected errors so Next.js error handling can process them. Do not convert programming errors or unknown exceptions into expected action failures.
- Keep `redirect`, `notFound`, and other Next.js control-flow calls outside broad `try`/`catch` blocks so they are not accidentally converted to action failures.
- Return only serializable, minimal data required by the caller.

## Commands and Verification

- Use the smallest relevant verification set for the change.
- Run `pnpm lint` after TypeScript, React, or application-code changes.
- Run `pnpm build` for changes that affect compilation, runtime behavior, dependencies, or framework configuration.
- Run `pnpm exec prisma validate` after changing `prisma/schema.prisma`.
- Run `pnpm db:generate` when changed schema types are consumed by application code.
- This project currently has no automated test script. Do not claim tests passed when none were run.
- Do not run `pnpm dev` or start a browser for verification unless the user explicitly asks for it. Actual people will verify browser behavior.
- If a relevant check cannot run or fails for a pre-existing or environmental reason, report the command and reason clearly.

## Definition of Done

- The requested behavior or artifact is complete and matches the stated scope.
- Relevant validation commands pass, or any unverified checks and blockers are reported.
- The final diff contains no unrelated changes.
- Generated files and documentation are consistent with the change when they are in scope.
- Remaining risks, assumptions, or follow-up work are stated explicitly.

## Clarification

- Ask clarifying questions before implementation when a request is vague or when crucial decisions have multiple materially different solutions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
