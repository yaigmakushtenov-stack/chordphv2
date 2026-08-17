# Project Agent Rules

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
- AWS SDK v3 S3 client and request-presigner APIs used with Backblaze B2.

## Repository Map

- `src/app` contains App Router pages, layouts, and Route Handlers.
- `src/components` contains UI components and application providers.
- `src/lib` contains authentication, Prisma, storage, and realtime integrations.
- `prisma/schema.prisma` is the database schema.
- `src/generated/prisma` is generated code. Never edit it manually; regenerate it from the schema.
- `public` contains static assets.
- When repository documentation conflicts with installed packages, the schema, or active source code, verify the current implementation and report the stale documentation instead of following it blindly.

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
- Follow the project's existing Route Handler patterns for API endpoints. Do not introduce Server Actions merely by assumption; use them when the project establishes that pattern or the task clearly requires them.
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

## Commands and Verification

- Use the smallest relevant verification set for the change.
- Run `pnpm lint` after TypeScript, React, or application-code changes.
- Run `pnpm build` for changes that affect compilation, runtime behavior, dependencies, or framework configuration.
- Run `pnpm exec prisma validate` after changing `prisma/schema.prisma`.
- Run `pnpm db:generate` when changed schema types are consumed by application code.
- This project currently has no automated test script. Do not claim tests passed when none were run.
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
