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

## Backblaze B2 storage

Storage uses Backblaze B2 through its S3-compatible API. Create a bucket-scoped
application key with read, write, and delete permissions, then add the five
`B2_*` values from `.env.example` to `.env`. Use the S3 endpoint and region shown
for the bucket in the Backblaze console.

Objects are organized under this enforced prefix structure:

```text
chordph/
  images/<user-id>/<generated-file-name>
  music/<user-id>/<generated-file-name>
```

Authenticated clients request a five-minute upload URL from
`POST /api/storage/upload-url`:

```json
{
  "folder": "images",
  "fileName": "cover.jpg",
  "contentType": "image/jpeg",
  "size": 245760
}
```

The response contains the Backblaze object key, upload URL, expiration, and
required headers. Upload the file body directly to that URL with `PUT`.

Configure the bucket's CORS rules to allow `PUT` and `Content-Type` from
`http://localhost:3000` and each trusted production origin. Never expose
`B2_KEY_ID` or `B2_APPLICATION_KEY` to browser code.

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
