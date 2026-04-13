# DreamLabs Investment Portfolio - Frontend Architecture Report

**Generated:** April 11, 2026  
**Framework:** React 19 + TypeScript 5.9 + TanStack Router + Vite  
**Styling:** Tailwind CSS 4.2 + shadcn/ui (new-york style)

---

## 1. Route Structure

### File-Based Routing (TanStack Router + Codegen)

The frontend uses **TanStack Router** with file-based routing conventions. Routes are auto-generated into [frontend/src/routeTree.gen.ts](frontend/src/routeTree.gen.ts).

#### Route Tree:
```
frontend/src/routes/
├── __root.tsx                    (Root route → error boundary, devtools)
├── login.tsx                      (Public route: /login)
├── signup.tsx                     (Public route: /signup)
├── recover-password.tsx           (Public route: /recover-password)
├── reset-password.tsx             (Public route: /reset-password)
├── _layout.tsx                    (Protected layout: /_layout)
│   └── _layout/
│       ├── index.tsx              (Dashboard: /_layout/ → /)
│       ├── items.tsx              (Items list: /_layout/items)
│       ├── admin.tsx              (Admin panel: /_layout/admin, superuser only)
│       └── settings.tsx           (User settings: /_layout/settings)
```

#### Key Pattern: Protected Routes via `beforeLoad` Middleware

```tsx
// frontend/src/routes/_layout.tsx
export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({ to: "/login" })
    }
  },
})
```

- Role-based gating on `/admin` route checks `user.is_superuser` in `beforeLoad`
- Redirects unauthenticated users to `/login` automatically
- See [frontend/src/routes/_layout/admin.tsx](frontend/src/routes/_layout/admin.tsx#L11-L15) for superuser check

#### Meta Tag Management

Routes define title metadata via `head()`—auto-rendered by TanStack Router:

```tsx
export const Route = createFileRoute("/_layout/items")({
  head: () => ({
    meta: [{ title: "Items - FastAPI Template" }],
  }),
})
```

---

## 2. Layout System

### Main Layout: `_layout.tsx`

[frontend/src/routes/_layout.tsx](frontend/src/routes/_layout.tsx) wraps all protected routes with:

- **SidebarProvider** (shadcn/ui sidebar component)
- **AppSidebar** (navigation, theme toggle, user menu)
- **SidebarInset** (main content area with max-width constraint)

```tsx
function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
        </header>
        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />    {/* Route-specific content */}
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
```

### AuthLayout: `frontend/src/components/Common/AuthLayout.tsx`

Two-column grid layout for login/signup/password-recovery pages:
- **Left column:** Logo on muted background (hidden on mobile)
- **Right column:** Auth form centered with Appearance toggle and Footer
- Responsive: Full-width on mobile, 2 columns on lg+ screens

```tsx
<div className="grid min-h-svh lg:grid-cols-2">
  <div className="bg-muted dark:bg-zinc-900 relative hidden lg:flex ...">
    <Logo variant="full" className="h-16" asLink={false} />
  </div>
  <div className="flex flex-col gap-4 p-6 md:p-10">
    <Appearance />  {/* Theme toggle in top-right */}
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-xs">{children}</div>  {/* Form container */}
    </div>
    <Footer />
  </div>
</div>
```

### Navigation: `frontend/src/components/Sidebar/AppSidebar.tsx`

- **Collapsible sidebar** with icon-only state (`collapsible="icon"`)
- **Conditional menu items** based on user role:
  ```tsx
  const items = currentUser?.is_superuser
    ? [...baseItems, { icon: Users, title: "Admin", path: "/admin" }]
    : baseItems
  ```
- Base items: Dashboard (`/`), Items (`/items`)
- Superuser-only: Admin (`/admin`)
- Footer: Appearance toggle + User menu

---

## 3. Existing UI Components

### shadcn/ui Component Library

All components are individually wrapped and re-exported from [frontend/src/components/ui/](frontend/src/components/ui/):

| Component | File | Source | Usage |
|-----------|------|--------|-------|
| `Alert` | alert.tsx | @radix-ui/react-alert-dialog | Error/success messages |
| `Avatar` | avatar.tsx | @radix-ui/react-avatar | User profile pictures |
| `Badge` | badge.tsx | (custom) | Status labels, tags |
| `Button` | button.tsx | @radix-ui/react-button | Primary/secondary actions |
| `Card` | card.tsx | (custom) | Content containers |
| `Checkbox` | checkbox.tsx | @radix-ui/react-checkbox | Boolean form inputs |
| `Dialog` | dialog.tsx | @radix-ui/react-dialog | Modal dialogs (AddItem, EditItem) |
| `DropdownMenu` | dropdown-menu.tsx | @radix-ui/react-dropdown-menu | Context menus (ItemActionsMenu) |
| `Form` | form.tsx | react-hook-form wrapper | Form field container |
| `Input` | input.tsx | (custom) | Text, email, password inputs |
| `Label` | label.tsx | @radix-ui/react-label | Form field labels |
| `LoadingButton` | loading-button.tsx | (custom) | Button with loading spinner |
| `PasswordInput` | password-input.tsx | (custom) | Password field with visibility toggle |
| `Pagination` | pagination.tsx | (custom) | Table pagination controls |
| `Select` | select.tsx | @radix-ui/react-select | Dropdown selection |
| `Separator` | separator.tsx | @radix-ui/react-separator | Visual divider |
| `Sheet` | sheet.tsx | @radix-ui/react-dialog (modal variant) | Mobile sidebar drawer |
| `Sidebar` | sidebar.tsx | (custom with Radix primitives) | Navigation container |
| `Skeleton` | skeleton.tsx | (custom) | Loading placeholder |
| `Sonner` | sonner.tsx | sonner library | Toast notifications |
| `Table` | table.tsx | (custom semantic HTML) | Data table markup |
| `Tabs` | tabs.tsx | @radix-ui/react-tabs | Tab navigation (Settings page) |
| `Tooltip` | tooltip.tsx | @radix-ui/react-tooltip | Hover help text |

### Portfolio-Specific Components

#### Items Module: [frontend/src/components/Items/](frontend/src/components/Items/)
- `AddItem.tsx` — Modal form to create item (React Hook Form + Dialog)
- `EditItem.tsx` — Modal form to edit item (wrapped in DropdownMenuItem)
- `DeleteItem.tsx` — Delete confirmation dialog
- `ItemActionsMenu.tsx` — Ellipsis menu with Edit/Delete actions (DropdownMenu)
- `columns.tsx` — TanStack Table column definitions for items list

#### Admin Module: [frontend/src/components/Admin/](frontend/src/components/Admin/)
- `AddUser.tsx` — Create user modal
- `EditUser.tsx` — Edit user modal
- `DeleteUser.tsx` — Delete user confirmation
- `UserActionsMenu.tsx` — Ellipsis menu for user row actions
- `columns.tsx` — TanStack Table columns for users list (includes `isCurrentUser` field)

#### User Settings Module: [frontend/src/components/UserSettings/](frontend/src/components/UserSettings/)
- `UserInformation.tsx` — Display/edit user profile
- `ChangePassword.tsx` — Change password form
- `DeleteAccount.tsx` — Delete account button
- `DeleteConfirmation.tsx` — Confirmation modal

#### Common Components: [frontend/src/components/Common/](frontend/src/components/Common/)
- `AuthLayout.tsx` — Two-column layout for auth pages
- `DataTable.tsx` — Generic reusable table component (TanStack Table wrapper)
- `ErrorComponent.tsx` — Error boundary fallback UI
- `NotFound.tsx` — 404 page
- `Footer.tsx` — Footer with links
- `Logo.tsx` — App logo (responsive: `full` vs `responsive` variant)
- `Appearance.tsx` — Theme toggle dropdown menu

#### Pending/Skeleton States: [frontend/src/components/Pending/](frontend/src/components/Pending/)
- `PendingItems.tsx` — Loading skeleton for items table
- `PendingUsers.tsx` — Loading skeleton for users table

---

## 4. API Integration Pattern

### Auto-Generated TypeScript Client via @hey-api/openapi-ts

**Configuration:** [frontend/openapi-ts.config.ts](frontend/openapi-ts.config.ts)

```ts
export default defineConfig({
  input: "./openapi.json",                    // Input: Backend OpenAPI spec
  output: "./src/client",                     // Output: Auto-generated SDK
  plugins: [
    "legacy/axios",                           // HTTP transport layer
    {
      name: "@hey-api/sdk",
      asClass: true,                          // Generate ServiceClass pattern
      operationId: true,
      classNameBuilder: "{{name}}Service",    // Generates *Service classes
      methodNameBuilder: (operation) => {
        // Strips service prefix from method names
        // Example: "ItemsServiceCreateItem" → "createItem"
      },
    },
    {
      name: "@hey-api/schemas",
      type: "json",                           // TypeScript types from schemas
    },
  ],
})
```

**Generated Files:**
- [frontend/src/client/sdk.gen.ts](frontend/src/client/sdk.gen.ts) — Service classes (e.g., `ItemsService`, `UsersService`, `LoginService`)
- [frontend/src/client/types.gen.ts](frontend/src/client/types.gen.ts) — TypeScript types (e.g., `ItemPublic`, `UserPublic`, `ItemCreate`)
- [frontend/src/client/index.ts](frontend/src/client/index.ts) — Main entry point exporting all classes and types

**Command to Regenerate:**
```bash
npm run generate-client    # Runs: openapi-ts
```

### Service Class Pattern

Backend endpoints are mapped to Service classes with typed methods:

```ts
// Generated example (from openapi.json)
ItemsService.readItems({ skip: 0, limit: 100 })      // GET /api/v1/items
ItemsService.createItem({ requestBody: data })       // POST /api/v1/items
ItemsService.updateItem({ id, requestBody: data })   // PUT /api/v1/items/{id}
ItemsService.deleteItem({ id })                      // DELETE /api/v1/items/{id}

UsersService.readUsers({ skip: 0, limit: 100 })      // GET /api/v1/users
UsersService.readUserMe()                             // GET /api/v1/users/me
LoginService.loginAccessToken({ formData })          // POST /api/v1/login/access-token
```

### API Client Setup: [frontend/src/main.tsx](frontend/src/main.tsx)

```ts
import { OpenAPI } from "./client"

// Configure base URL from environment
OpenAPI.BASE = import.meta.env.VITE_API_URL

// Configure token provider (reads from localStorage)
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || ""
}
```

### React Query Integration

All API calls are wrapped in React Query (TanStack Query) for caching, synchronization, and error handling:

```ts
// frontend/src/routes/_layout/items.tsx
const { data: items } = useSuspenseQuery({
  queryFn: () => ItemsService.readItems({ skip: 0, limit: 100 }),
  queryKey: ["items"],
})
```

**Global Error Handling:**
```ts
// main.tsx
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: Error) => {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        localStorage.removeItem("access_token")
        window.location.href = "/login"  // Auto-logout on 401/403
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: Error) => { /* same handler */ },
  }),
})
```

---

## 5. Authentication Context

### `useAuth` Hook: [frontend/src/hooks/useAuth.ts](frontend/src/hooks/useAuth.ts)

Custom hook encapsulating all auth operations:

```ts
const useAuth = () => {
  // Current user query (auto-enabled if logged in)
  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),  // Prevents query when no token
  })

  // Sign-up mutation
  const signUpMutation = useMutation({
    mutationFn: (data: UserRegister) =>
      UsersService.registerUser({ requestBody: data }),
    onSuccess: () => navigate({ to: "/login" }),
    onError: /* error toast */,
  })

  // Login: save token to localStorage
  const login = async (data: AccessToken) => {
    const response = await LoginService.loginAccessToken({ formData: data })
    localStorage.setItem("access_token", response.access_token)
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => navigate({ to: "/" }),  // Redirect to dashboard
    onError: /* error toast */,
  })

  // Logout: clear token and redirect
  const logout = () => {
    localStorage.removeItem("access_token")
    navigate({ to: "/login" })
  }

  return {
    user,              // UserPublic | null
    signUpMutation,    // useMutation result object
    loginMutation,     // useMutation result object
    logout,            // Function
  }
}

export { isLoggedIn }  // Helper: checks localStorage.access_token
export default useAuth
```

### User Structure: `UserPublic` (from OpenAPI schema)

Based on [backend/app/models.py](../backend/app/models.py), the user object contains:
```ts
interface UserPublic {
  id: string
  email: string
  full_name: string | null
  is_superuser: boolean
  is_active?: boolean
}
```

### Token Storage

- **Where:** `localStorage.access_token`
- **Type:** JWT token from backend `/api/v1/login/access-token` endpoint
- **Lifecycle:**
  - **Set:** On successful login
  - **Read:** By `OpenAPI.TOKEN` provider for all API requests
  - **Clear:** On logout or when API returns 401/403

---

## 6. Form Patterns

### React Hook Form + Zod Validation

All forms follow a consistent pattern: Zod schema → useForm → FormField components.

#### Pattern Example: Login Form [frontend/src/routes/login.tsx](frontend/src/routes/login.tsx)

```ts
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

// 1. Define Zod schema (optional: match OpenAPI type)
const formSchema = z.object({
  username: z.email(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
}) satisfies z.ZodType<AccessToken>  // Ensure schema matches BackendType

type FormData = z.infer<typeof formSchema>

// 2. Initialize form with zodResolver
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  mode: "onBlur",                  // Validate on blur
  criteriaMode: "all",             // Show all validation errors
  defaultValues: { username: "", password: "" },
})

// 3. Define mutation
const mutation = useMutation({
  mutationFn: (data: AccessToken) =>
    LoginService.loginAccessToken({ formData: data }),
  onSuccess: () => navigate({ to: "/" }),
  onError: handleError.bind(showErrorToast),
})

// 4. Bind form submit
const onSubmit = (data: FormData) => mutation.mutate(data)

// 5. Render form
return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="email@example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* More fields... */}
      <LoadingButton
        type="submit"
        disabled={mutation.isPending}
        isLoading={mutation.isPending}
      >
        Sign In
      </LoadingButton>
    </form>
  </Form>
)
```

#### Pattern Applied: Add/Edit Item Forms

**Add Item:** [frontend/src/components/Items/AddItem.tsx](frontend/src/components/Items/AddItem.tsx)
- Form inside Dialog modal
- Schema: `{ title: required, description: optional }`
- Mutation: `ItemsService.createItem()`

**Edit Item:** [frontend/src/components/Items/EditItem.tsx](frontend/src/components/Items/EditItem.tsx)
- Pre-populates form with item values: `defaultValues: { title: item.title, description: item.description }`
- Mutation: `ItemsService.updateItem({ id, requestBody: data })`
- Closes dialog on success

### Form Field Components Wrapper

[frontend/src/components/ui/form.tsx](frontend/src/components/ui/form.tsx) provides shadcn/ui integration:

```tsx
// Provides: Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage
// These are React Hook Form + Radix UI label primitives wrappers

<Form {...form}>                    {/* FormProvider wrapper */}
  <FormField
    control={form.control}
    name="fieldName"
    render={({ field }) => (
      <FormItem>                   {/* Receives id from context */}
        <FormLabel>Label text</FormLabel>
        <FormControl>
          <Input {...field} />    {/* Composed with input */}
        </FormControl>
        <FormMessage />            {/* Auto-displays validation errors */}
      </FormItem>
    )}
  />
</Form>
```

### Custom Form Components

- `Input` — Standard text input (with optional styling)
- `PasswordInput` — Text input with visibility toggle button
- `LoadingButton` — Button that shows spinner during mutation and disables while loading

---

## 7. Dark Mode Implementation

### Theme Provider: [frontend/src/components/theme-provider.tsx](frontend/src/components/theme-provider.tsx)

Custom React Context provider (similar to next-themes pattern):

```tsx
export type Theme = "dark" | "light" | "system"

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: "dark" | "light"
  setTheme: (theme: Theme) => void
}

// Usage in app:
<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
  {/* App content */}
</ThemeProvider>
```

### How It Works

1. **Storage:** Persists to `localStorage` with key `vite-ui-theme`
2. **Default:** `"dark"` (portfolio dashboard is dark by default)
3. **System Detection:** If theme is `"system"`, reads OS preference via `window.matchMedia("(prefers-color-scheme: dark)")`
4. **DOM Updates:** Applies CSS class to `<html>` element:
   ```ts
   root.classList.remove("light", "dark")
   root.classList.add(resolvedTheme)  // "dark" or "light"
   ```

### Theme Toggle: Appearance Component [frontend/src/components/Common/Appearance.tsx](frontend/src/components/Common/Appearance.tsx)

Dropdown menu in sidebar footer:

```tsx
const ICON_MAP: Record<Theme, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
}

<SidebarMenuItem>
  <DropdownMenu>
    <DropdownMenuTrigger>
      <SidebarMenuButton data-testid="theme-button">
        <Icon className="size-4" />
        <span>Appearance</span>
      </SidebarMenuButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => setTheme("light")}>
        <Sun className="mr-2 h-4 w-4" /> Light
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("dark")}>
        <Moon className="mr-2 h-4 w-4" /> Dark
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme("system")}>
        <Monitor className="mr-2 h-4 w-4" /> System
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</SidebarMenuItem>
```

### CSS Variables (OKLCH Color Space)

See [DESIGN.md](DESIGN.md) for color palette details.

**Theme colors in [frontend/src/index.css](frontend/src/index.css):**
- `--primary` / `--primary-foreground` — Primary UI color (cyan-blue in OKLCH)
- `--destructive` / `--destructive-foreground` — Delete/danger actions (red)
- `--warning` — Amber-600 for portfolio warnings (stale holdings, etc.)
- `--success` — Green-600 for positive indicators
- `--background` / `--foreground` — Canvas colors (light/dark mode aware)
- `--muted` / `--muted-foreground` — Disabled/secondary text

---

## 8. Data Table Patterns

### Generic DataTable Component: [frontend/src/components/Common/DataTable.tsx](frontend/src/components/Common/DataTable.tsx)

Reusable wrapper around TanStack Table (`@tanstack/react-table`):

```tsx
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]    // Type-safe column definitions
  data: TData[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),      // Core rendering
    getPaginationRowModel: getPaginationRowModel(),  // Pagination plugin
  })

  // Renders:
  // - TableHeader with styled HeaderGroups
  // - TableBody with paginated rows
  // - Pagination controls (← → page size select)
}
```

### Column Definition Pattern: [frontend/src/components/Items/columns.tsx](frontend/src/components/Items/columns.tsx)

Type-safe column configuration:

```ts
import type { ColumnDef } from "@tanstack/react-table"
import type { ItemPublic } from "@/client"

export const columns: ColumnDef<ItemPublic>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <CopyId id={row.original.id} />,
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.original.description
      return (
        <span className={cn(
          "max-w-xs truncate block text-muted-foreground",
          !description && "italic",
        )}>
          {description || "No description"}
        </span>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ItemActionsMenu item={row.original} />
      </div>
    ),
  },
]
```

**Key patterns:**
- `accessorKey` — Maps to object property
- `header` — Column title (string or function)
- `cell` — Custom render function with access to `row.original` (full row data)
- `id` — Manual column ID for non-accessor columns (e.g., actions)

### Usage: Items List [frontend/src/routes/_layout/items.tsx](frontend/src/routes/_layout/items.tsx)

```tsx
function ItemsTableContent() {
  const { data: items } = useSuspenseQuery(getItemsQueryOptions())
  
  if (items.data.length === 0) {
    return <EmptyState />
  }

  return <DataTable columns={columns} data={items.data} />
}

function Items() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1>Items</h1>
        <AddItem />
      </div>
      <Suspense fallback={<PendingItems />}>
        <ItemsTableContent />
      </Suspense>
    </div>
  )
}
```

### Admin Users Table: [frontend/src/components/Admin/columns.tsx](frontend/src/components/Admin/columns.tsx)

Enhanced column definitions with:
- `UserTableData` type extends `UserPublic` with `isCurrentUser` boolean
- Columns: Email, Full Name, Superuser status, Created at, Modified at
- Actions: Edit, Delete (disabled for current user)

---

## 9. Type Generation from OpenAPI Spec

### Workflow

```
Backend (FastAPI)
    ↓ (exports OpenAPI spec)
backend/.../openapi.json
    ↓ (git'd to repo during build)
frontend/openapi.json
    ↓ (openapi-ts reads spec)
frontend/src/client/ (auto-generated)
    ├── sdk.gen.ts        (ServiceClass methods)
    ├── types.gen.ts      (TypeScript interfaces)
    └── index.ts          (exports)
```

### Types Generated

All FastAPI Pydantic models → TypeScript interfaces:

**Example generated types:**
```ts
interface ItemPublic {
  id: string
  title: string
  description?: string
  owner_id: string
}

interface ItemCreate {
  title: string
  description?: string
}

interface UserPublic {
  id: string
  email: string
  full_name?: string
  is_active: boolean
  is_superuser: boolean
}

interface AccessToken {
  username: string
  password: string
}
```

### Service Class Signatures

```ts
class ItemsService {
  static readItems(
    request?: { skip?: number; limit?: number }
  ): CancelablePromise<{ data: ItemPublic[] }>
  
  static createItem(
    request: { requestBody: ItemCreate }
  ): CancelablePromise<ItemPublic>
  
  static updateItem(
    request: { id: string; requestBody: ItemCreate }
  ): CancelablePromise<ItemPublic>
  
  static deleteItem(
    request: { id: string }
  ): CancelablePromise<{ message: string }>
}

class UsersService {
  static readUserMe(): CancelablePromise<UserPublic>
  static readUsers(
    request?: { skip?: number; limit?: number }
  ): CancelablePromise<{ data: UserPublic[] }>
  // ... etc
}

class LoginService {
  static loginAccessToken(
    request: { formData: AccessToken }
  ): CancelablePromise<{ access_token: string; token_type: string }>
}
```

### Regeneration Command

After backend schema changes:
```bash
cd frontend
npm run generate-client    # Runs: openapi-ts (from openapi-ts.config.ts)
```

This updates all generated types and methods to match the current API.

---

## Summary: Implementation Consistency Checklist

When adding new frontend features, ensure:

- ✅ **Routes:** Use file-based naming in `src/routes/[_layout]/page.tsx` format
- ✅ **Protected routes:** Add `beforeLoad` middleware check with `isLoggedIn()` or role checks
- ✅ **Layouts:** Wrap with `SidebarProvider` + `AppSidebar` for protected pages; use `AuthLayout` for public auth flows  
- ✅ **API calls:** Use auto-generated ServiceClass methods (e.g., `ItemsService.readItems()`)
- ✅ **Data fetching:** Wrap with `useSuspenseQuery()` and `queryKey` for cache invalidation
- ✅ **Forms:** Zod schema → `zodResolver` → `useForm()` → `FormField` components
- ✅ **Modals:** Use `Dialog` component with `useState` for open state
- ✅ **Tables:** Use `DataTable` generic + `ColumnDef[]` columns from separate `columns.tsx` file
- ✅ **Error handling:** Use `useCustomToast()` → `showErrorToast()`; mutations auto-handle 401/403 redirects
- ✅ **Components:** Only use shadcn/ui components from `src/components/ui/`; no custom CSS (use Tailwind utilities only)
- ✅ **Dark mode:** Works automatically; no explicit theme switching in components needed
- ✅ **User context:** Always use `useAuth()` hook to access `user` data; check `user.is_superuser` for role gates
- ✅ **Types:** Import from `@/client` (auto-generated); never manually define response types

---

**Generated:** April 11, 2026 by Frontend Architecture Explorer  
**For:** DreamLabs Investment Portfolio Implementation Team
