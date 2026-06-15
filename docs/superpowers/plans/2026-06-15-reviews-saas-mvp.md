# Reviews SaaS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant SaaS where agencies manage businesses that collect customer reviews via QR/link, routing 5-star ratings to Google and capturing lower ratings internally.

**Architecture:** Single Next.js (App Router) full-stack app with Server Actions, Postgres via Prisma, and Auth.js credentials auth. Core decision logic (review outcome, metrics, slug generation, tenant scoping) lives in pure, unit-tested functions; Prisma calls stay thin around them. Tenancy is enforced by row-scoping derived from the session role.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Prisma + Postgres, Auth.js (credentials), Tailwind CSS + shadcn/ui, bcryptjs, qrcode, Vitest.

---

## File Structure

```
src/
  lib/
    prisma.ts              # Prisma client singleton
    auth.ts                # Auth.js config + session helpers
    tenancy.ts             # role-based scoping helpers (pure + query wrappers)
    review-logic.ts        # pure: decideOutcome()
    metrics.ts             # pure: aggregateMetrics()
    slug.ts                # pure: slugify()
    password.ts            # hash/verify wrappers around bcryptjs
  app/
    (auth)/login/page.tsx
    (panel)/layout.tsx           # authed shell
    (panel)/super/...            # super admin pages + actions
    (panel)/agency/...           # agency admin pages + actions
    (panel)/business/...         # business admin pages + actions
    (panel)/seller/...           # seller pages + actions
    r/[businessSlug]/page.tsx          # generic public review
    r/[businessSlug]/[sellerSlug]/page.tsx
    r/_components/ReviewFlow.tsx       # client multi-step form
    api/auth/[...nextauth]/route.ts
  middleware.ts            # route protection
prisma/
  schema.prisma
  seed.ts
tests/
  *.test.ts
```

Split by responsibility: pure logic in `src/lib/*` (testable without a DB), one page+actions folder per role, public flow isolated under `app/r`.

---

## Phase 0 — Project Foundation

### Task 1: Scaffold Next.js app

**Files:**
- Create: project root files via scaffolder

- [ ] **Step 1: Scaffold the app**

Run (in `d:/Proyectos/5stars`):
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --import-alias "@/*" --no-turbopack
```
Accept defaults. Expected: `src/app`, `package.json`, `tailwind.config.ts` created.

- [ ] **Step 2: Install dependencies**

```bash
npm install @prisma/client next-auth@beta bcryptjs qrcode zod
npm install -D prisma vitest @types/bcryptjs @types/qrcode tsx
```
Expected: installs succeed, `package.json` lists the deps.

- [ ] **Step 3: Add Vitest config and test script**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```
Add to `package.json` scripts: `"test": "vitest run"`, `"db:seed": "tsx prisma/seed.ts"`.

- [ ] **Step 4: Verify it builds and tests run**

Run: `npm run test`
Expected: "No test files found" (exit 0) — config is valid.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with deps and Vitest"
```

---

### Task 2: Prisma schema and database

**Files:**
- Create: `prisma/schema.prisma`, `.env`
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: Write the schema**

Create `prisma/schema.prisma`:
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { SUPER_ADMIN AGENCY_ADMIN BUSINESS_ADMIN SELLER }
enum QuestionType { TEXT MULTIPLE_CHOICE }
enum ReviewOutcome { REDIRECTED_GOOGLE INTERNAL }

model Agency {
  id         String     @id @default(cuid())
  name       String
  createdAt  DateTime   @default(now())
  businesses Business[]
  users      User[]
}

model Business {
  id              String     @id @default(cuid())
  agencyId        String
  agency          Agency     @relation(fields: [agencyId], references: [id])
  name            String
  slug            String     @unique
  logoUrl         String?
  googleReviewUrl String
  starThreshold   Int        @default(5)
  createdAt       DateTime   @default(now())
  users           User[]
  sellers         Seller[]
  questions       Question[]
  reviews         Review[]
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  role         Role
  agencyId     String?
  agency       Agency?   @relation(fields: [agencyId], references: [id])
  businessId   String?
  business     Business? @relation(fields: [businessId], references: [id])
  seller       Seller?
  createdAt    DateTime  @default(now())
}

model Seller {
  id         String   @id @default(cuid())
  businessId String
  business   Business @relation(fields: [businessId], references: [id])
  name       String
  slug       String
  userId     String?  @unique
  user       User?    @relation(fields: [userId], references: [id])
  reviews    Review[]
  @@unique([businessId, slug])
}

model Question {
  id         String       @id @default(cuid())
  businessId String
  business   Business     @relation(fields: [businessId], references: [id])
  text       String
  type       QuestionType @default(TEXT)
  options    String[]     @default([])
  order      Int
  active     Boolean      @default(true)
  answers    Answer[]
}

model Review {
  id           String        @id @default(cuid())
  businessId   String
  business     Business      @relation(fields: [businessId], references: [id])
  sellerId     String?
  seller       Seller?       @relation(fields: [sellerId], references: [id])
  starRating   Int
  outcome      ReviewOutcome
  comment      String?
  contactName  String?
  contactPhone String?
  contactEmail String?
  createdAt    DateTime      @default(now())
  answers      Answer[]
}

model Answer {
  id         String   @id @default(cuid())
  reviewId   String
  review     Review   @relation(fields: [reviewId], references: [id])
  questionId String
  question   Question @relation(fields: [questionId], references: [id])
  value      String
}
```

- [ ] **Step 2: Configure database URL**

Create `.env` with a local or hosted Postgres URL:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fivestars?schema=public"
NEXTAUTH_SECRET="dev-secret-change-me"
NEXTAUTH_URL="http://localhost:3000"
```
Add `.env` to `.gitignore` (verify it is already ignored by create-next-app).

- [ ] **Step 3: Create the Prisma client singleton**

Create `src/lib/prisma.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Run the first migration**

Run: `npx prisma migrate dev --name init`
Expected: migration created, `@prisma/client` generated, tables created.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Prisma schema, client, and initial migration"
```

---

### Task 3: Password helpers (TDD)

**Files:**
- Create: `src/lib/password.ts`
- Test: `tests/password.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/password.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("s3cret");
    expect(await verifyPassword("s3cret", hash)).toBe(true);
  });
  it("rejects a wrong password", async () => {
    const hash = await hashPassword("s3cret");
    expect(await verifyPassword("nope", hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/password.test.ts`
Expected: FAIL — cannot find module `@/lib/password`.

- [ ] **Step 3: Implement**

Create `src/lib/password.ts`:
```ts
import bcrypt from "bcryptjs";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/password.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add password hashing helpers"
```

---

### Task 4: Slug helper (TDD)

**Files:**
- Create: `src/lib/slug.ts`
- Test: `tests/slug.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/slug.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Café Pérez 1")).toBe("cafe-perez-1");
  });
  it("strips leading/trailing separators", () => {
    expect(slugify("  Hola!!  ")).toBe("hola");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/slug.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/slug.ts`:
```ts
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/slug.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add slugify helper"
```

---

## Phase 1 — Core Logic (pure, unit-tested)

### Task 5: Review outcome logic (TDD)

**Files:**
- Create: `src/lib/review-logic.ts`
- Test: `tests/review-logic.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/review-logic.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { decideOutcome } from "@/lib/review-logic";

describe("decideOutcome", () => {
  it("redirects at or above threshold", () => {
    expect(decideOutcome(5, 5)).toBe("REDIRECTED_GOOGLE");
  });
  it("keeps internal below threshold", () => {
    expect(decideOutcome(4, 5)).toBe("INTERNAL");
    expect(decideOutcome(1, 5)).toBe("INTERNAL");
  });
  it("respects a custom threshold", () => {
    expect(decideOutcome(4, 4)).toBe("REDIRECTED_GOOGLE");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/review-logic.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/review-logic.ts`:
```ts
export type Outcome = "REDIRECTED_GOOGLE" | "INTERNAL";

export function decideOutcome(starRating: number, threshold: number): Outcome {
  return starRating >= threshold ? "REDIRECTED_GOOGLE" : "INTERNAL";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/review-logic.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add review outcome decision logic"
```

---

### Task 6: Metrics aggregation (TDD)

**Files:**
- Create: `src/lib/metrics.ts`
- Test: `tests/metrics.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/metrics.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { aggregateMetrics } from "@/lib/metrics";

const sample = [
  { starRating: 5, outcome: "REDIRECTED_GOOGLE" as const },
  { starRating: 5, outcome: "REDIRECTED_GOOGLE" as const },
  { starRating: 3, outcome: "INTERNAL" as const },
  { starRating: 1, outcome: "INTERNAL" as const },
];

describe("aggregateMetrics", () => {
  it("computes total, average, redirected count and distribution", () => {
    const m = aggregateMetrics(sample);
    expect(m.total).toBe(4);
    expect(m.average).toBe(3.5);
    expect(m.redirected).toBe(2);
    expect(m.distribution).toEqual({ 1: 1, 2: 0, 3: 1, 4: 0, 5: 2 });
  });
  it("handles empty input", () => {
    const m = aggregateMetrics([]);
    expect(m).toEqual({
      total: 0, average: 0, redirected: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/metrics.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/metrics.ts`:
```ts
export type ReviewLike = {
  starRating: number;
  outcome: "REDIRECTED_GOOGLE" | "INTERNAL";
};
export type Metrics = {
  total: number;
  average: number;
  redirected: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function aggregateMetrics(reviews: ReviewLike[]): Metrics {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Metrics["distribution"];
  let sum = 0;
  let redirected = 0;
  for (const r of reviews) {
    distribution[r.starRating as 1 | 2 | 3 | 4 | 5]++;
    sum += r.starRating;
    if (r.outcome === "REDIRECTED_GOOGLE") redirected++;
  }
  const total = reviews.length;
  const average = total === 0 ? 0 : Math.round((sum / total) * 100) / 100;
  return { total, average, redirected, distribution };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/metrics.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add metrics aggregation"
```

---

### Task 7: Tenant scoping logic (TDD)

**Files:**
- Create: `src/lib/tenancy.ts`
- Test: `tests/tenancy.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tenancy.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { businessWhereForSession } from "@/lib/tenancy";

describe("businessWhereForSession", () => {
  it("super admin sees all (empty filter)", () => {
    expect(businessWhereForSession({ role: "SUPER_ADMIN" })).toEqual({});
  });
  it("agency admin scoped to their agency", () => {
    expect(businessWhereForSession({ role: "AGENCY_ADMIN", agencyId: "a1" }))
      .toEqual({ agencyId: "a1" });
  });
  it("business admin scoped to their business", () => {
    expect(businessWhereForSession({ role: "BUSINESS_ADMIN", businessId: "b1" }))
      .toEqual({ id: "b1" });
  });
  it("seller scoped to their business", () => {
    expect(businessWhereForSession({ role: "SELLER", businessId: "b1" }))
      .toEqual({ id: "b1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tenancy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/tenancy.ts`:
```ts
export type SessionUser = {
  role: "SUPER_ADMIN" | "AGENCY_ADMIN" | "BUSINESS_ADMIN" | "SELLER";
  agencyId?: string | null;
  businessId?: string | null;
};

/** Prisma `where` filter limiting Business rows to what the session may see. */
export function businessWhereForSession(u: SessionUser): Record<string, unknown> {
  switch (u.role) {
    case "SUPER_ADMIN":
      return {};
    case "AGENCY_ADMIN":
      return { agencyId: u.agencyId ?? "__none__" };
    case "BUSINESS_ADMIN":
    case "SELLER":
      return { id: u.businessId ?? "__none__" };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tenancy.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add tenant scoping helper"
```

---

## Phase 2 — Auth

### Task 8: Auth.js credentials + seed super admin

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Create: `prisma/seed.ts`

- [ ] **Step 1: Configure Auth.js**

Create `src/lib/auth.ts`:
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "");
        const password = String(creds?.password ?? "");
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        return {
          id: user.id, email: user.email, role: user.role,
          agencyId: user.agencyId, businessId: user.businessId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.agencyId = (user as any).agencyId;
        token.businessId = (user as any).businessId;
      }
      return token;
    },
    session({ session, token }) {
      (session.user as any).role = token.role;
      (session.user as any).agencyId = token.agencyId;
      (session.user as any).businessId = token.businessId;
      return session;
    },
  },
});
```

- [ ] **Step 2: Wire the route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 3: Write the seed**

Create `prisma/seed.ts`:
```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@5stars.local";
  const passwordHash = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role: "SUPER_ADMIN" },
  });
  console.log("Seeded super admin:", email);
}
main().finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Run the seed and verify**

Run: `npm run db:seed`
Expected: prints "Seeded super admin: admin@5stars.local".

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Auth.js credentials and super admin seed"
```

---

### Task 9: Login page + route protection

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/middleware.ts`
- Create: `src/lib/session.ts`

- [ ] **Step 1: Add a session helper**

Create `src/lib/session.ts`:
```ts
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/tenancy";

export async function requireUser(): Promise<SessionUser & { id: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  const u = session.user as any;
  return { id: u.id, role: u.role, agencyId: u.agencyId, businessId: u.businessId };
}

export function homePathForRole(role: SessionUser["role"]): string {
  return {
    SUPER_ADMIN: "/super",
    AGENCY_ADMIN: "/agency",
    BUSINESS_ADMIN: "/business",
    SELLER: "/seller",
  }[role];
}
```

- [ ] **Step 2: Add the login page**

Create `src/app/(auth)/login/page.tsx`:
```tsx
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/super",
    });
  }
  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">Iniciar sesión</h1>
      <form action={login} className="space-y-4">
        <input name="email" type="email" placeholder="Correo"
          className="w-full rounded border p-2" required />
        <input name="password" type="password" placeholder="Contraseña"
          className="w-full rounded border p-2" required />
        <button className="w-full rounded bg-black p-2 text-white">Entrar</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Protect the panel routes**

Create `src/middleware.ts`:
```ts
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isPanel = ["/super", "/agency", "/business", "/seller"].some((p) =>
    req.nextUrl.pathname.startsWith(p),
  );
  if (isPanel && !req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = { matcher: ["/super/:path*", "/agency/:path*", "/business/:path*", "/seller/:path*"] };
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, open `http://localhost:3000/super` → should redirect to `/login`.
Log in with `admin@5stars.local` / `admin1234` → should reach `/super` (page added in Task 10; expect 404 until then, but no redirect to login).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add login page, session helpers, and route protection"
```

---

## Phase 3 — Provisioning (cascade CRUD)

> Each task below follows the same shape. Server actions live next to their page in an `actions.ts` file marked `"use server"`. All list/query actions call `requireUser()` and scope via `businessWhereForSession` or explicit role checks.

### Task 10: Super admin — agencies CRUD

**Files:**
- Create: `src/app/(panel)/super/page.tsx`, `src/app/(panel)/super/actions.ts`
- Create: `src/app/(panel)/layout.tsx`

- [ ] **Step 1: Add the authed shell layout**

Create `src/app/(panel)/layout.tsx`:
```tsx
import { requireUser, homePathForRole } from "@/lib/session";
import { signOut } from "@/lib/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b p-4">
        <a href={homePathForRole(user.role)} className="font-bold">5stars</a>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="text-sm underline">Salir</button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Add agency actions**

Create `src/app/(panel)/super/actions.ts`:
```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  agencyName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

export async function createAgency(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  const data = schema.parse({
    agencyName: formData.get("agencyName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  const agency = await prisma.agency.create({ data: { name: data.agencyName } });
  await prisma.user.create({
    data: {
      email: data.adminEmail,
      passwordHash: await hashPassword(data.adminPassword),
      role: "AGENCY_ADMIN",
      agencyId: agency.id,
    },
  });
  revalidatePath("/super");
}
```

- [ ] **Step 3: Add the super admin page**

Create `src/app/(panel)/super/page.tsx`:
```tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createAgency } from "./actions";

export default async function SuperPage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") return <p>No autorizado.</p>;
  const agencies = await prisma.agency.findMany({
    include: { _count: { select: { businesses: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Agencias</h1>
        <ul className="space-y-2">
          {agencies.map((a) => (
            <li key={a.id} className="rounded border p-3">
              {a.name} — {a._count.businesses} negocios
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Crear agencia</h2>
        <form action={createAgency} className="grid max-w-md gap-2">
          <input name="agencyName" placeholder="Nombre agencia" className="rounded border p-2" required />
          <input name="adminEmail" type="email" placeholder="Email admin" className="rounded border p-2" required />
          <input name="adminPassword" type="password" placeholder="Contraseña admin" className="rounded border p-2" required />
          <button className="rounded bg-black p-2 text-white">Crear</button>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Verify manually**

Run `npm run dev`, log in as super admin, create an agency, confirm it appears in the list.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: super admin agencies CRUD + panel shell"
```

---

### Task 11: Agency admin — businesses CRUD

**Files:**
- Create: `src/app/(panel)/agency/page.tsx`, `src/app/(panel)/agency/actions.ts`

- [ ] **Step 1: Add business actions**

Create `src/app/(panel)/agency/actions.ts`:
```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/slug";

const schema = z.object({
  name: z.string().min(1),
  googleReviewUrl: z.string().url(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

export async function createBusiness(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "AGENCY_ADMIN" || !user.agencyId) throw new Error("FORBIDDEN");
  const data = schema.parse({
    name: formData.get("name"),
    googleReviewUrl: formData.get("googleReviewUrl"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });
  const base = slugify(data.name);
  const existing = await prisma.business.count({ where: { slug: { startsWith: base } } });
  const slug = existing === 0 ? base : `${base}-${existing + 1}`;
  const business = await prisma.business.create({
    data: { name: data.name, slug, googleReviewUrl: data.googleReviewUrl, agencyId: user.agencyId },
  });
  await prisma.user.create({
    data: {
      email: data.adminEmail,
      passwordHash: await hashPassword(data.adminPassword),
      role: "BUSINESS_ADMIN",
      businessId: business.id,
    },
  });
  revalidatePath("/agency");
}
```

- [ ] **Step 2: Add the agency page**

Create `src/app/(panel)/agency/page.tsx`:
```tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createBusiness } from "./actions";

export default async function AgencyPage() {
  const user = await requireUser();
  if (user.role !== "AGENCY_ADMIN" || !user.agencyId) return <p>No autorizado.</p>;
  const businesses = await prisma.business.findMany({
    where: { agencyId: user.agencyId },
    include: { _count: { select: { reviews: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Negocios</h1>
        <ul className="space-y-2">
          {businesses.map((b) => (
            <li key={b.id} className="rounded border p-3">
              {b.name} — {b._count.reviews} reviews — <code>/r/{b.slug}</code>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Crear negocio</h2>
        <form action={createBusiness} className="grid max-w-md gap-2">
          <input name="name" placeholder="Nombre negocio" className="rounded border p-2" required />
          <input name="googleReviewUrl" type="url" placeholder="URL reseña Google" className="rounded border p-2" required />
          <input name="adminEmail" type="email" placeholder="Email admin negocio" className="rounded border p-2" required />
          <input name="adminPassword" type="password" placeholder="Contraseña" className="rounded border p-2" required />
          <button className="rounded bg-black p-2 text-white">Crear</button>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Log in as the agency admin created in Task 10; create a business; confirm slug shown.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: agency businesses CRUD"
```

---

### Task 12: Business admin — sellers CRUD

**Files:**
- Create: `src/app/(panel)/business/sellers/page.tsx`, `src/app/(panel)/business/sellers/actions.ts`

- [ ] **Step 1: Add seller actions**

Create `src/app/(panel)/business/sellers/actions.ts`:
```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { slugify } from "@/lib/slug";

const schema = z.object({ name: z.string().min(1) });

export async function createSeller(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) throw new Error("FORBIDDEN");
  const { name } = schema.parse({ name: formData.get("name") });
  const base = slugify(name);
  const existing = await prisma.seller.count({
    where: { businessId: user.businessId, slug: { startsWith: base } },
  });
  const slug = existing === 0 ? base : `${base}-${existing + 1}`;
  await prisma.seller.create({ data: { name, slug, businessId: user.businessId } });
  revalidatePath("/business/sellers");
}
```

- [ ] **Step 2: Add the sellers page**

Create `src/app/(panel)/business/sellers/page.tsx`:
```tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createSeller } from "./actions";

export default async function SellersPage() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;
  const business = await prisma.business.findUnique({
    where: { id: user.businessId },
    include: { sellers: { orderBy: { name: "asc" } } },
  });
  if (!business) return <p>Negocio no encontrado.</p>;
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Vendedores</h1>
      <ul className="space-y-2">
        {business.sellers.map((s) => (
          <li key={s.id} className="rounded border p-3">
            {s.name} — <code>/r/{business.slug}/{s.slug}</code>
          </li>
        ))}
      </ul>
      <form action={createSeller} className="grid max-w-md gap-2">
        <input name="name" placeholder="Nombre vendedor" className="rounded border p-2" required />
        <button className="rounded bg-black p-2 text-white">Agregar</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Log in as business admin; add a seller; confirm its personal path renders.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: business sellers CRUD"
```

---

## Phase 4 — Business Configuration

### Task 13: Business settings (Google URL, threshold, logo)

**Files:**
- Create: `src/app/(panel)/business/settings/page.tsx`, `src/app/(panel)/business/settings/actions.ts`

- [ ] **Step 1: Add settings action**

Create `src/app/(panel)/business/settings/actions.ts`:
```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const schema = z.object({
  googleReviewUrl: z.string().url(),
  logoUrl: z.string().url().or(z.literal("")).optional(),
  starThreshold: z.coerce.number().int().min(1).max(5),
});

export async function updateSettings(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) throw new Error("FORBIDDEN");
  const data = schema.parse({
    googleReviewUrl: formData.get("googleReviewUrl"),
    logoUrl: formData.get("logoUrl"),
    starThreshold: formData.get("starThreshold"),
  });
  await prisma.business.update({
    where: { id: user.businessId },
    data: {
      googleReviewUrl: data.googleReviewUrl,
      logoUrl: data.logoUrl || null,
      starThreshold: data.starThreshold,
    },
  });
  revalidatePath("/business/settings");
}
```

- [ ] **Step 2: Add the settings page**

Create `src/app/(panel)/business/settings/page.tsx`:
```tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { updateSettings } from "./actions";

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;
  const b = await prisma.business.findUnique({ where: { id: user.businessId } });
  if (!b) return <p>Negocio no encontrado.</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Configuración</h1>
      <form action={updateSettings} className="grid max-w-md gap-3">
        <label className="text-sm">URL reseña Google
          <input name="googleReviewUrl" defaultValue={b.googleReviewUrl} className="mt-1 w-full rounded border p-2" required />
        </label>
        <label className="text-sm">URL logo (opcional)
          <input name="logoUrl" defaultValue={b.logoUrl ?? ""} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="text-sm">Umbral de estrellas para redirigir
          <input name="starThreshold" type="number" min={1} max={5} defaultValue={b.starThreshold} className="mt-1 w-full rounded border p-2" required />
        </label>
        <button className="rounded bg-black p-2 text-white">Guardar</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Update settings as business admin; reload; confirm values persisted.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: business settings page"
```

---

### Task 14: Question builder CRUD

**Files:**
- Create: `src/app/(panel)/business/questions/page.tsx`, `src/app/(panel)/business/questions/actions.ts`

- [ ] **Step 1: Add question actions**

Create `src/app/(panel)/business/questions/actions.ts`:
```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

async function ownBusinessId() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) throw new Error("FORBIDDEN");
  return user.businessId;
}

const createSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["TEXT", "MULTIPLE_CHOICE"]),
  options: z.string().optional(),
});

export async function createQuestion(formData: FormData) {
  const businessId = await ownBusinessId();
  const data = createSchema.parse({
    text: formData.get("text"),
    type: formData.get("type"),
    options: formData.get("options"),
  });
  const options =
    data.type === "MULTIPLE_CHOICE" && data.options
      ? data.options.split(",").map((o) => o.trim()).filter(Boolean)
      : [];
  const count = await prisma.question.count({ where: { businessId } });
  await prisma.question.create({
    data: { businessId, text: data.text, type: data.type, options, order: count },
  });
  revalidatePath("/business/questions");
}

export async function deleteQuestion(formData: FormData) {
  const businessId = await ownBusinessId();
  const id = String(formData.get("id"));
  await prisma.question.deleteMany({ where: { id, businessId } });
  revalidatePath("/business/questions");
}

export async function toggleQuestion(formData: FormData) {
  const businessId = await ownBusinessId();
  const id = String(formData.get("id"));
  const q = await prisma.question.findFirst({ where: { id, businessId } });
  if (q) await prisma.question.update({ where: { id }, data: { active: !q.active } });
  revalidatePath("/business/questions");
}
```

- [ ] **Step 2: Add the questions page**

Create `src/app/(panel)/business/questions/page.tsx`:
```tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { createQuestion, deleteQuestion, toggleQuestion } from "./actions";

export default async function QuestionsPage() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;
  const questions = await prisma.question.findMany({
    where: { businessId: user.businessId },
    orderBy: { order: "asc" },
  });
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Preguntas</h1>
      <p className="text-sm text-gray-500">La pregunta de estrellas se muestra siempre al final.</p>
      <ul className="space-y-2">
        {questions.map((q) => (
          <li key={q.id} className="flex items-center justify-between rounded border p-3">
            <span>{q.text} {q.active ? "" : "(inactiva)"} <em className="text-xs text-gray-400">{q.type}</em></span>
            <span className="flex gap-2">
              <form action={toggleQuestion}><input type="hidden" name="id" value={q.id} /><button className="text-sm underline">{q.active ? "Desactivar" : "Activar"}</button></form>
              <form action={deleteQuestion}><input type="hidden" name="id" value={q.id} /><button className="text-sm text-red-600 underline">Eliminar</button></form>
            </span>
          </li>
        ))}
      </ul>
      <form action={createQuestion} className="grid max-w-md gap-2">
        <input name="text" placeholder="Texto de la pregunta" className="rounded border p-2" required />
        <select name="type" className="rounded border p-2">
          <option value="TEXT">Texto libre</option>
          <option value="MULTIPLE_CHOICE">Opción múltiple</option>
        </select>
        <input name="options" placeholder="Opciones separadas por coma (si aplica)" className="rounded border p-2" />
        <button className="rounded bg-black p-2 text-white">Agregar pregunta</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Create, toggle, and delete a question as business admin.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: question builder CRUD"
```

---

## Phase 5 — Public Review Flow

### Task 15: Submit review server action (TDD on logic + thin DB wrapper)

**Files:**
- Create: `src/app/r/actions.ts`
- Test: `tests/submit-review.test.ts`

- [ ] **Step 1: Write the failing test for the payload builder**

Create `tests/submit-review.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildReviewCreateData } from "@/app/r/actions";

describe("buildReviewCreateData", () => {
  const base = {
    businessId: "b1", sellerId: "s1", starThreshold: 5,
    starRating: 5, answers: [{ questionId: "q1", value: "Sí" }],
    comment: "", contactName: "", contactPhone: "", contactEmail: "",
  };
  it("marks 5-star as redirected", () => {
    const d = buildReviewCreateData(base);
    expect(d.outcome).toBe("REDIRECTED_GOOGLE");
    expect(d.answers.create).toHaveLength(1);
  });
  it("marks low rating as internal and keeps contact", () => {
    const d = buildReviewCreateData({ ...base, starRating: 3, comment: "lento", contactName: "Ana" });
    expect(d.outcome).toBe("INTERNAL");
    expect(d.comment).toBe("lento");
    expect(d.contactName).toBe("Ana");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/submit-review.test.ts`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Implement the action + pure builder**

Create `src/app/r/actions.ts`:
```ts
"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decideOutcome } from "@/lib/review-logic";

export type BuildInput = {
  businessId: string;
  sellerId: string | null;
  starThreshold: number;
  starRating: number;
  answers: { questionId: string; value: string }[];
  comment?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
};

/** Pure: builds the Prisma `data` for a Review.create call. */
export function buildReviewCreateData(input: BuildInput) {
  return {
    businessId: input.businessId,
    sellerId: input.sellerId ?? undefined,
    starRating: input.starRating,
    outcome: decideOutcome(input.starRating, input.starThreshold),
    comment: input.comment || null,
    contactName: input.contactName || null,
    contactPhone: input.contactPhone || null,
    contactEmail: input.contactEmail || null,
    answers: { create: input.answers.map((a) => ({ questionId: a.questionId, value: a.value })) },
  };
}

const payloadSchema = z.object({
  businessId: z.string(),
  sellerId: z.string().nullable(),
  starRating: z.coerce.number().int().min(1).max(5),
  answers: z.array(z.object({ questionId: z.string(), value: z.string() })),
  comment: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
});

export async function submitReview(raw: unknown) {
  const p = payloadSchema.parse(raw);
  const business = await prisma.business.findUnique({ where: { id: p.businessId } });
  if (!business) throw new Error("BUSINESS_NOT_FOUND");
  const data = buildReviewCreateData({ ...p, starThreshold: business.starThreshold });
  await prisma.review.create({ data });
  if (data.outcome === "REDIRECTED_GOOGLE") redirect(business.googleReviewUrl);
  redirect(`/r/${business.slug}/gracias`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/submit-review.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: submit review action with pure payload builder"
```

---

### Task 16: Public review pages + flow UI

**Files:**
- Create: `src/app/r/[businessSlug]/page.tsx`
- Create: `src/app/r/[businessSlug]/[sellerSlug]/page.tsx`
- Create: `src/app/r/[businessSlug]/gracias/page.tsx`
- Create: `src/app/r/_components/ReviewFlow.tsx`
- Create: `src/app/r/_components/loader.ts`

- [ ] **Step 1: Add the shared loader**

Create `src/app/r/_components/loader.ts`:
```ts
import { prisma } from "@/lib/prisma";

export async function loadReviewContext(businessSlug: string, sellerSlug?: string) {
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: { questions: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  if (!business) return null;
  let sellerId: string | null = null;
  if (sellerSlug) {
    const seller = await prisma.seller.findFirst({
      where: { businessId: business.id, slug: sellerSlug },
    });
    sellerId = seller?.id ?? null;
  }
  return { business, sellerId };
}
```

- [ ] **Step 2: Add the client flow component**

Create `src/app/r/_components/ReviewFlow.tsx`:
```tsx
"use client";
import { useState } from "react";
import { submitReview } from "@/app/r/actions";

type Question = { id: string; text: string; type: "TEXT" | "MULTIPLE_CHOICE"; options: string[] };
type Props = {
  businessId: string;
  sellerId: string | null;
  name: string;
  logoUrl: string | null;
  questions: Question[];
};

export function ReviewFlow({ businessId, sellerId, name, logoUrl, questions }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const total = questions.length + 1; // +1 for stars step
  const onStars = questions.length;
  const isLow = stars > 0 && stars < 5;

  async function finish() {
    await submitReview({
      businessId, sellerId, starRating: stars,
      answers: questions.map((q) => ({ questionId: q.id, value: answers[q.id] ?? "" })),
      comment, contactName, contactPhone,
    });
  }

  return (
    <main className="mx-auto max-w-md p-6">
      {logoUrl && <img src={logoUrl} alt={name} className="mx-auto mb-4 h-16" />}
      <h1 className="mb-6 text-center text-xl font-bold">{name}</h1>

      {step < questions.length && (
        <div className="space-y-4">
          <p className="font-medium">{questions[step].text}</p>
          {questions[step].type === "TEXT" ? (
            <textarea className="w-full rounded border p-2"
              value={answers[questions[step].id] ?? ""}
              onChange={(e) => setAnswers({ ...answers, [questions[step].id]: e.target.value })} />
          ) : (
            <div className="space-y-2">
              {questions[step].options.map((o) => (
                <button key={o} type="button"
                  onClick={() => { setAnswers({ ...answers, [questions[step].id]: o }); setStep(step + 1); }}
                  className="block w-full rounded border p-2 text-left hover:bg-gray-50">{o}</button>
              ))}
            </div>
          )}
          <button onClick={() => setStep(step + 1)} className="w-full rounded bg-black p-2 text-white">Siguiente</button>
        </div>
      )}

      {step === onStars && (
        <div className="space-y-4 text-center">
          <p className="font-medium">¿Cómo calificarías tu experiencia?</p>
          <div className="flex justify-center gap-2 text-4xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setStars(n)}
                className={n <= stars ? "text-yellow-400" : "text-gray-300"}>★</button>
            ))}
          </div>
          {stars >= 5 && (
            <button onClick={finish} className="w-full rounded bg-black p-2 text-white">Enviar</button>
          )}
          {isLow && (
            <div className="space-y-3 text-left">
              <p className="text-sm text-gray-600">Lamentamos no haber cumplido tus expectativas. ¿Qué podemos mejorar?</p>
              <textarea placeholder="Tu comentario" className="w-full rounded border p-2"
                value={comment} onChange={(e) => setComment(e.target.value)} />
              <input placeholder="Tu nombre (opcional)" className="w-full rounded border p-2"
                value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <input placeholder="Teléfono (opcional)" className="w-full rounded border p-2"
                value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              <button onClick={finish} className="w-full rounded bg-black p-2 text-white">Enviar</button>
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-gray-400">Paso {Math.min(step + 1, total)} de {total}</p>
    </main>
  );
}
```

- [ ] **Step 3: Add the page routes**

Create `src/app/r/[businessSlug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { loadReviewContext } from "@/app/r/_components/loader";
import { ReviewFlow } from "@/app/r/_components/ReviewFlow";

export default async function PublicReview({ params }: { params: Promise<{ businessSlug: string }> }) {
  const { businessSlug } = await params;
  const ctx = await loadReviewContext(businessSlug);
  if (!ctx) notFound();
  const { business, sellerId } = ctx;
  return (
    <ReviewFlow businessId={business.id} sellerId={sellerId} name={business.name}
      logoUrl={business.logoUrl} questions={business.questions} />
  );
}
```

Create `src/app/r/[businessSlug]/[sellerSlug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { loadReviewContext } from "@/app/r/_components/loader";
import { ReviewFlow } from "@/app/r/_components/ReviewFlow";

export default async function PublicReviewSeller({ params }: { params: Promise<{ businessSlug: string; sellerSlug: string }> }) {
  const { businessSlug, sellerSlug } = await params;
  const ctx = await loadReviewContext(businessSlug, sellerSlug);
  if (!ctx) notFound();
  const { business, sellerId } = ctx;
  return (
    <ReviewFlow businessId={business.id} sellerId={sellerId} name={business.name}
      logoUrl={business.logoUrl} questions={business.questions} />
  );
}
```

Create `src/app/r/[businessSlug]/gracias/page.tsx`:
```tsx
export default function Gracias() {
  return (
    <main className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-2xl font-bold">¡Gracias por tu opinión!</h1>
      <p className="mt-2 text-gray-600">La usaremos para mejorar.</p>
    </main>
  );
}
```

- [ ] **Step 4: Verify manually**

Open `/r/<slug>` and `/r/<slug>/<sellerSlug>`. Submit 5 stars → redirects to the Google URL. Submit 3 stars → shows comment/contact form → lands on `/gracias`. Confirm rows in DB via `npx prisma studio`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: public review flow pages and UI"
```

---

## Phase 6 — Dashboards & QR

### Task 17: Business dashboard + internal reviews list

**Files:**
- Create: `src/app/(panel)/business/page.tsx`

- [ ] **Step 1: Add the dashboard**

Create `src/app/(panel)/business/page.tsx`:
```tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { aggregateMetrics } from "@/lib/metrics";

export default async function BusinessDashboard() {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return <p>No autorizado.</p>;
  const reviews = await prisma.review.findMany({
    where: { businessId: user.businessId },
    include: { seller: true, answers: { include: { question: true } } },
    orderBy: { createdAt: "desc" },
  });
  const m = aggregateMetrics(reviews);
  const bySeller = new Map<string, { name: string; count: number }>();
  for (const r of reviews) {
    const key = r.seller?.name ?? "Sin vendedor";
    const cur = bySeller.get(key) ?? { name: key, count: 0 };
    cur.count++; bySeller.set(key, cur);
  }
  const internal = reviews.filter((r) => r.outcome === "INTERNAL");
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Panel del negocio</h1>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total reviews" value={m.total} />
        <Stat label="Promedio" value={m.average} />
        <Stat label="Redirigidos a Google" value={m.redirected} />
        <Stat label="Internas (<5)" value={internal.length} />
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Distribución</h2>
        <ul className="text-sm">
          {[5, 4, 3, 2, 1].map((n) => (
            <li key={n}>{n}★ — {m.distribution[n as 1|2|3|4|5]}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Por vendedor</h2>
        <ul className="text-sm">
          {[...bySeller.values()].map((s) => <li key={s.name}>{s.name} — {s.count}</li>)}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Reviews internas</h2>
        <ul className="space-y-2">
          {internal.map((r) => (
            <li key={r.id} className="rounded border p-3 text-sm">
              <div>{r.starRating}★ — {r.seller?.name ?? "Sin vendedor"}</div>
              {r.comment && <div className="text-gray-700">“{r.comment}”</div>}
              {(r.contactName || r.contactPhone) && (
                <div className="text-gray-500">{r.contactName} {r.contactPhone}</div>
              )}
              <ul className="mt-1 text-gray-500">
                {r.answers.map((a) => <li key={a.id}>{a.question.text}: {a.value}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

Log in as business admin after submitting some reviews; confirm stats, distribution, per-seller, and the internal reviews list with answers/contact.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: business dashboard with metrics and internal reviews"
```

---

### Task 18: Seller dashboard + QR generation

**Files:**
- Create: `src/app/(panel)/seller/page.tsx`
- Create: `src/lib/qr.ts`
- Create: `src/app/(panel)/business/sellers/qr/[sellerId]/route.ts`
- Test: `tests/qr.test.ts`

- [ ] **Step 1: Write the failing test for QR data URL**

Create `tests/qr.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { qrDataUrl } from "@/lib/qr";

describe("qrDataUrl", () => {
  it("returns a PNG data URL", async () => {
    const url = await qrDataUrl("https://example.com/r/foo");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/qr.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the QR helper**

Create `src/lib/qr.ts`:
```ts
import QRCode from "qrcode";

export function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 320, margin: 1 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/qr.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Add the seller dashboard with link + QR**

Create `src/app/(panel)/seller/page.tsx`:
```tsx
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { aggregateMetrics } from "@/lib/metrics";
import { qrDataUrl } from "@/lib/qr";

export default async function SellerDashboard() {
  const user = await requireUser();
  if (user.role !== "SELLER") return <p>No autorizado.</p>;
  const seller = await prisma.seller.findFirst({
    where: { userId: user.id },
    include: { business: true, reviews: true },
  });
  if (!seller) return <p>Vendedor no encontrado.</p>;
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${base}/r/${seller.business.slug}/${seller.slug}`;
  const qr = await qrDataUrl(link);
  const m = aggregateMetrics(seller.reviews);
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Hola, {seller.name}</h1>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Reviews" value={m.total} />
        <Stat label="Promedio" value={m.average} />
        <Stat label="A Google" value={m.redirected} />
      </div>
      <div className="space-y-2">
        <p className="text-sm">Tu link: <a className="underline" href={link}>{link}</a></p>
        <img src={qr} alt="QR" className="h-48 w-48" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
```

- [ ] **Step 6: Add a QR download route for business admin (per seller)**

Create `src/app/(panel)/business/sellers/qr/[sellerId]/route.ts`:
```ts
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { qrDataUrl } from "@/lib/qr";

export async function GET(_req: Request, { params }: { params: Promise<{ sellerId: string }> }) {
  const user = await requireUser();
  if (user.role !== "BUSINESS_ADMIN" || !user.businessId) return new Response("Forbidden", { status: 403 });
  const { sellerId } = await params;
  const seller = await prisma.seller.findFirst({
    where: { id: sellerId, businessId: user.businessId },
    include: { business: true },
  });
  if (!seller) return new Response("Not found", { status: 404 });
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${base}/r/${seller.business.slug}/${seller.slug}`;
  const dataUrl = await qrDataUrl(link);
  const b64 = dataUrl.split(",")[1];
  return new Response(Buffer.from(b64, "base64"), {
    headers: { "Content-Type": "image/png" },
  });
}
```

- [ ] **Step 7: Verify manually**

Create a SELLER user linked to a seller (set `userId` via Prisma Studio or extend seller creation to also create a user). Log in; confirm metrics, link, and QR render. Hit `/business/sellers/qr/<id>` as business admin → downloads a PNG.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: seller dashboard with QR and business QR route"
```

---

### Task 19: Agency & super admin aggregate metrics

**Files:**
- Modify: `src/app/(panel)/agency/page.tsx` (add metrics summary)
- Modify: `src/app/(panel)/super/page.tsx` (add totals)

- [ ] **Step 1: Add aggregate metrics to the agency page**

In `src/app/(panel)/agency/page.tsx`, after loading `businesses`, add a reviews summary. Replace the `businesses` query and add metrics:
```tsx
import { aggregateMetrics } from "@/lib/metrics";
// ...inside AgencyPage, after businesses load:
const reviews = await prisma.review.findMany({
  where: { business: { agencyId: user.agencyId } },
  select: { starRating: true, outcome: true },
});
const m = aggregateMetrics(reviews);
// render above the businesses list:
// <section className="grid grid-cols-3 gap-4">
//   <Stat label="Reviews" value={m.total} />
//   <Stat label="Promedio" value={m.average} />
//   <Stat label="A Google" value={m.redirected} />
// </section>
```
Add the same `Stat` helper used in Task 17 to this file.

- [ ] **Step 2: Add totals to the super admin page**

In `src/app/(panel)/super/page.tsx`, add global counts:
```tsx
const [agencyCount, businessCount, reviewCount] = await Promise.all([
  prisma.agency.count(),
  prisma.business.count(),
  prisma.review.count(),
]);
// render a small summary row of these three counts above the agencies list.
```

- [ ] **Step 3: Verify manually**

Log in as agency admin → see aggregate reviews. Log in as super admin → see global totals.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: aggregate metrics for agency and super admin"
```

---

### Task 20: Full test pass and smoke check

- [ ] **Step 1: Run all unit tests**

Run: `npm run test`
Expected: PASS — password, slug, review-logic, metrics, tenancy, submit-review, qr.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: End-to-end smoke**

With `npm run dev`: seed → log in as super admin → create agency → log in as agency → create business (note slug) → log in as business → add seller, set Google URL, add a question → open `/r/<slug>` submit 5★ (redirects to Google) and 3★ (internal capture) → confirm business dashboard shows both.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "test: full suite green and e2e smoke verified"
```

---

## Self-Review Notes

- **Spec coverage:** hierarchy/roles (Tasks 7–12), data model (Task 2), public flow + redirect/internal logic (Tasks 15–16), question builder (Task 14), business settings incl. threshold (Task 13), dashboards & per-seller breakdown (Tasks 17–19), QR (Task 18), Spanish UI throughout, manual provisioning (no billing). All covered.
- **Out of scope respected:** no Stripe, no Google API/OAuth, no whitelabel, no email notifications.
- **Open item for execution:** SELLER login provisioning — Task 18 notes linking `Seller.userId` to a `User`. If seller self-login is needed at launch, extend Task 12's `createSeller` to optionally create a `User` with role `SELLER` and set `userId`. Left optional since the spec marks seller login as optional.
