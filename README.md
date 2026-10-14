# VedRashi Admin Panel

Admin console for the VedRashi platform: the customer app (UserApp), the pandit and astrologer apps (astroApp) and the public website (vedrashi).

React 19 · Vite · TypeScript · React Router 7 · Tailwind CSS v4 · Recharts · lucide-react

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

Sign in with any email and a password of 6+ characters (mock auth in `src/lib/auth.tsx`).

## Structure

```
src/
  components/ui/   shared UI kit (DataTable, Modal, Drawer, StatusBadge, useConfirm, useToast…)
  data/            shared customers / astrologers / pandits + their collections
  layout/          sidebar + top bar
  lib/             store (mock async collections), auth, formatting utils
  modules/         one folder per feature; each index.tsx exports { nav, routes }
    registry.ts    module order = sidebar order
```

| Sidebar group | Modules |
|---|---|
| Overview | Dashboard, Customers |
| Partners | Astrologers, Pandits, Approvals (KYC, price, bank, certificate, profile, expertise requests) |
| Operations | Consultations (+ gifts catalogue), Puja Bookings, Puja Catalogue |
| Store | Products, Orders |
| Finance | Transactions, Payouts, Refunds, Pricing & Fees |
| Growth | Coupons & Rewards, Banners, Notifications |
| Content | Blogs, Pages & FAQs (legal, FAQs, website content), Testimonials |
| Support | Support Tickets, Leads & Inquiries, Reviews |
| System | Settings, Admin Users (roles, audit log) |

## Connecting the backend

All data lives in `createCollection()` stores (`src/lib/store.ts`). Each one exposes async `list / get / create / update / remove`. To go live, replace a module's `data.ts` collection with one that calls your API. Pages use `useCollection()` and don't need to change. Mock seed data sits next to each collection, so it's easy to delete.
