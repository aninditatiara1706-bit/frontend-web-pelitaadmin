# Frontend API connection

The frontend uses the standalone Express API in the sibling `backend` directory. The browser API client is `src/lib/api.ts`; it sends requests to `NEXT_PUBLIC_API_URL` and includes the HttpOnly session cookie.

## Run locally

1. Configure PostgreSQL, `DATABASE_URL`, `JWT_SECRET`, and seed-admin values in `backend/.env`. Follow the setup instructions in `backend/README.md`.
2. In `frontend`, copy `.env.example` to `.env.local`. The default API URL is `http://localhost:4000/api`.
3. Start the backend from `backend` with `npm run dev`.
4. Start the frontend from `frontend` with `npm run dev`.
5. Sign in with the admin account created by `npm run db:seed`.

Set `FRONTEND_ORIGIN` in the backend environment to the exact frontend origin if it differs from `http://localhost:3000`. The Express API owns authentication and application data; use the backend folder's Prisma schema and migrations.
