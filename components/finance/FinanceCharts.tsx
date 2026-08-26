'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { CategoryTotal, MonthlyPoint } from '@/lib/finance/queries';

/**
 * Series colours.
 *
 * Deliberately NOT the brand green. Green-vs-orange is the classic red-green
 * confusion pair — checked with the palette validator, green/orange separates by
 * only ΔE 3–6 under protanopia, while blue/orange separates by 24.7. The brand
 * green stays in the page chrome; the marks use colours that stay legible.
 */
const RECEIVED = '#2a78d6';
const SPENT = '#eb6834';
/** Single-series bars cannot be confused with anything, so these stay on-brand. */
const CATEGORY = '#2c6144';

const INK = '#5e5041';
const INK_MUTED = '#8f7a68';
const GRID = '#ded5ca';

const CATEGORY_LABELS: Record<string, string> = {
  ration: 'Ration',
  transport: 'Transport',
  packaging: 'Packaging',
  storage: 'Storage',
  utilities: 'Utilities',
  other: 'Other',
};

function compact(value: number): string {
  if (Math.abs(value) >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-clay-200 bg-cream-50 px-3 py-2 shadow-lift">
      <p className="mb-1 text-xs font-semibold text-clay-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-xs text-clay-700">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          <span>{entry.name}</span>
          <span className="ml-auto font-medium tabular-nums text-clay-900">
            {formatCurrency(entry.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
}

/** Verified money in and out, month by month. Both series are rupees — one axis. */
export function MonthlyFinanceChart({ data }: { data: MonthlyPoint[] }) {
  const hasData = data.some((point) => point.received > 0 || point.spent > 0);

  if (!hasData) {
    return (
      <p className="py-12 text-center text-sm text-clay-500">
        Verified contributions and expenses will chart here.
      </p>
    );
  }

  return (
    <figure className="m-0">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: INK_MUTED, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
            />
            <YAxis
              tick={{ fill: INK_MUTED, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={compact}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(30,63,46,0.05)' }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: INK, paddingTop: 8 }}
            />
            <Bar dataKey="received" name="Received" fill={RECEIVED} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="spent" name="Spent" fill={SPENT} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Same numbers, reachable without reading the colours. */}
      <figcaption className="sr-only">
        <table>
          <caption>Verified contributions and expenses by month</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Received</th>
              <th scope="col">Spent</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.month}>
                <th scope="row">{point.month}</th>
                <td>{formatCurrency(point.received)}</td>
                <td>{formatCurrency(point.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

/** Verified spending by category. One series, so no legend — the heading names it. */
export function ExpenseCategoryChart({ data }: { data: CategoryTotal[] }) {
  if (!data.length) {
    return <p className="py-12 text-center text-sm text-clay-500">No verified expenses yet.</p>;
  }

  const rows = data.map((row) => ({
    label: CATEGORY_LABELS[row.category] ?? row.category,
    total: row.total,
  }));

  return (
    <figure className="m-0">
      <div style={{ height: Math.max(180, rows.length * 40 + 30) }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="2 4" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: INK_MUTED, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              tickFormatter={compact}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: INK, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={84}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(30,63,46,0.05)' }} />
            <Bar dataKey="total" name="Spent" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {rows.map((row) => (
                <Cell key={row.label} fill={CATEGORY} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="sr-only">
        <table>
          <caption>Verified spending by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{formatCurrency(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
