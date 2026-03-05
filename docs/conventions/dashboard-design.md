# Dashboard design — fintech style (AMT)

You are helping to design and refine the **admin dashboard UI** for the AMT rent management system.  
Your main goal is to produce layouts, components and styles that look like a modern **fintech** product (Stripe / Revolut / Brex–style).

## Dashboard design goals

- Make key **money metrics** visually dominant and easy to scan.
- Reduce visual noise, increase whitespace and clear hierarchy.
- Use consistent cards, spacing, typography, and color semantics.

## Layout

- Use a clear grid (2–3 columns on desktop):
  - **Top row:** KPI cards.
  - **Middle row:** “Incomes per month”, “Overdue”, “To pay”.
  - **Bottom row:** “Recent payments”.
- Cards in the same row should have **equal height** and **aligned headers**.
- Maintain generous internal padding (20–24px) and consistent gaps between cards (16–24px).

## KPI cards (top row)

- Focus KPIs:
  - **Outstanding amount** (Остаток к оплате).
  - **Overdue** (Просрочено).
  - Secondary: Total charged, Total paid.
- Inside each card:
  - **Big number** (32–40px), short label above or below.
  - Compact trend info: arrow icon + percentage (e.g. `↑ 12.5% MoM`).
  - For “Overdue”, show a small badge with the count of items (e.g. `3 charges`) and optionally a mini progress bar for share of total.
- Avoid long sentences inside cards; prioritize numbers and short labels.

## Lists: “Overdue” and “To pay”

- Use fintech‑style row layout:
  - **Left:** unit name (bold), subline with party name and short descriptor.
  - **Middle:** due date and a status badge:
    - “Overdue +35 days” – red.
    - “Due in 4 days” – orange.
  - **Right:** amount, right‑aligned, visually strongest element in the row.
- Add filters above lists: **All / Overdue / 7 days / 30 days**.
- Keep rows compact but with enough vertical spacing for readability.

## “Incomes per month”

- Card content:
  - Large total amount for the selected period.
  - Small badge with number of payments.
  - Optional small sparkline/mini chart showing daily/weekly trend.
- Add a **period selector** in the top right: `7d / 30d / 90d / YTD`.

## “Recent payments”

- Prefer a compact **table‑like list**:
  - Columns: Payment ID, Party, Date, Amount, Status.
  - Amount right‑aligned, highlighted.
  - Status as a badge with icon (Paid / Pending / Failed).
- Payment ID should look like a link to details page.

## Visual language (fintech style)

- **Background:** very light neutral (e.g. `#F5F7FA`); **cards:** white with soft shadow and `16–20px` radius.
- **Typography:**
  - One primary font, clear scale (e.g. 12/14/16/20/32/40).
  - Key amounts large and bold, labels small and neutral grey.
- **Colors:**
  - One accent color for positive/neutral metrics (e.g. green/blue).
  - Red/orange only for risk/negative (overdue, failed).
  - Do not use many different colors; rely on shades and font weight.
- **Icons:** use sparingly:
  - For trends (up/down).
  - For status (paid, overdue, pending).

## How to respond

- When asked to change or add UI, propose:
  - Concrete component structures (e.g. React components with prop names).
  - Clear layout descriptions (what goes in each card/row).
  - Improvements that reduce clutter and improve hierarchy, while keeping the existing domain (contracts, units, parties, charges, payments).
