# ChordPH v2

ChordPH v2 is built with Next.js, React, TypeScript, Tailwind CSS, and the App Router.

## Development

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and edit
`src/app/page.tsx` to update the home page.

## Authentication and database

Copy `.env.example` to `.env` and replace every placeholder. The configured
authentication provider is GitHub OAuth. Its local callback URL is
`http://localhost:3000/api/auth/callback/github`.

Apply the Auth.js schema to your PostgreSQL database and generate Prisma Client:

```bash
pnpm db:migrate --name init-auth
pnpm db:generate
```

Do not commit `.env` or expose `AUTH_SECRET` and OAuth client secrets to browser
code. `AUTH_TRUST_HOST=true` is appropriate for local development and deployments
behind a trusted reverse proxy; review it if requests can reach the app directly
with arbitrary host headers.

## Cloudflare R2 storage

Storage uses Cloudflare R2 through its S3-compatible API. Create a bucket-scoped
R2 API token with Object Read & Write permission, then add the four `R2_*`
values from `.env.example` to `.env`. Use the account-level S3 endpoint shown in
the R2 dashboard. The application uses R2's `auto` region internally.

Objects are organized under this enforced prefix structure:

```text
chordph/
  images/<user-id>/<generated-file-name>
  music/<user-id>/<generated-file-name>
```

Audio uploads call the authenticated `MusicActions.prepareUpload` Server Action
to validate file details and obtain a five-minute signed upload URL and required
headers. The browser uploads the file directly to R2 with `PUT`, bypassing
Vercel's request-body limit. `MusicActions.completeUpload` then verifies ownership
and the stored file's size and content type before making it available.

New Annotate keeps selected audio in browser memory for a local preview. It
creates the track and annotation before uploading and attaching that audio.
Abandoned drafts and failed annotation creation do not upload the selected file.
Reloading the page requires selecting the local file again. If uploading or
attaching audio fails after creation, the annotation remains saved and audio can
be added from the track page. Standalone music-library uploads still start when
a file is selected.

The R2 client uses `requestChecksumCalculation: "WHEN_REQUIRED"` so the SDK does
not add an empty-body checksum to signed upload URLs generated without a body.

Configure the bucket's CORS rules to allow `PUT` and `Content-Type` from
`http://localhost:3000` and each trusted production origin. Never expose
`R2_ACCESS_KEY_ID` or `R2_SECRET_ACCESS_KEY` to browser code. Presigned URLs must
use the R2 S3 API endpoint rather than a public bucket URL or custom domain.

In the R2 dashboard, open the bucket's Settings and edit its CORS policy. Add
the exact live-site origin (scheme and hostname, without a path) to
`AllowedOrigins`, retaining any existing rules needed for playback or other
clients. An upload rule looks like this; replace the example origin with your
live site's origin:

```json
[
  {
    "AllowedOrigins": ["https://your-live-domain.example", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

When migrating existing objects, preserve their complete `chordph/` keys so
existing database records continue to resolve. Keep the Backblaze bucket until
the R2 copy and application cutover have been verified.

## Checks

```bash
pnpm lint
pnpm build
```

## Useful scripts

- `pnpm dev` starts the local development server.
- `pnpm build` creates an optimized production build.
- `pnpm start` serves the production build.
- `pnpm lint` checks the code with ESLint.
- `pnpm db:generate` regenerates Prisma Client from the schema.
- `pnpm db:migrate` creates and applies a development migration.
- `pnpm db:studio` opens Prisma Studio.
