This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## CI/CD and Deployment

### CI (GitHub Actions)

A workflow is configured in `.github/workflows/ci.yml`.

- On each pull request: runs `npm ci`, `npm run lint`, `npm run test`.
- On push to `main`: runs `npm ci`, `npm run lint`, `npm run test`, `npm run build`.

### Vercel deployment

This repository is intended to be connected to Vercel with Git integration:

- `main` branch -> Production deployment.
- Feature branches / pull requests -> Preview deployments.

The website is currently available at: `https://althea-systems.vercel.app/fr`.

### Required environment variables

Use `.env.example` as the source of truth for required variables.

Configure these variables in Vercel for the appropriate environments (Production, Preview, Development):

- Supabase variables.
- Firebase variables.

### Health endpoint

An API health endpoint is available at:

- `GET /api/health` -> `{ "status": "ok" }`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
