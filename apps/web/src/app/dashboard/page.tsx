'use client';

import {
  AlertTriangle,
  Banknote,
  CheckSquare,
  Lock,
  Package,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePrincipal } from '@/hooks/use-principal';
import { useDashboardKpis, useMonthlyTrends, useTopItems } from '@/hooks/use-reports';

function KpiCard({
  title,
  value,
  icon: Icon,
  accent,
  hidden,
}: {
  title: string;
  value: string;
  icon: typeof Package;
  accent?: boolean;
  /** True when the field came back null — masked server-side because the caller lacks permission, not because it's genuinely zero. */
  hidden?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
        {hidden ? (
          <Lock className="text-muted-foreground h-4 w-4" />
        ) : (
          <Icon className={`h-4 w-4 ${accent ? 'text-destructive' : 'text-muted-foreground'}`} />
        )}
      </CardHeader>
      <CardContent>
        {hidden ? (
          <div
            className="text-muted-foreground text-2xl font-bold"
            title="Requires financials access"
          >
            &mdash;
          </div>
        ) : (
          <div className={`text-2xl font-bold ${accent ? 'text-destructive' : ''}`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { principal } = usePrincipal();
  const fullName = principal?.type === 'tenant' ? principal.fullName : null;

  const { data: kpis } = useDashboardKpis();
  const { data: trends } = useMonthlyTrends();
  const { data: topItems } = useTopItems();

  const money = (v: number | null | undefined) =>
    (v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  // kpis is undefined while loading; the individual fields are null when
  // the server masked them for lacking financials:view. Only the latter
  // should render as "hidden" — undefined during load should just show 0
  // briefly rather than flashing a lock icon.
  const financialsHidden = kpis !== undefined && kpis.salesMtd === null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome{fullName ? `, ${fullName}` : ''}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Sales this month"
          value={money(kpis?.salesMtd)}
          icon={ShoppingBag}
          hidden={financialsHidden}
        />
        <KpiCard
          title="Purchases this month"
          value={money(kpis?.purchasesMtd)}
          icon={ShoppingCart}
          hidden={financialsHidden}
        />
        <KpiCard
          title="Stock value"
          value={money(kpis?.stockValue)}
          icon={Package}
          hidden={financialsHidden}
        />
        <KpiCard
          title="Receivable (open)"
          value={money(kpis?.openAr)}
          icon={Wallet}
          hidden={financialsHidden}
        />
        <KpiCard
          title="Payable (open)"
          value={money(kpis?.openAp)}
          icon={Banknote}
          hidden={financialsHidden}
        />
        <KpiCard
          title="Pending approvals"
          value={String(kpis?.pendingApprovals ?? 0)}
          icon={CheckSquare}
          accent={(kpis?.pendingApprovals ?? 0) > 0}
        />
        <KpiCard title="Active employees" value={String(kpis?.activeEmployees ?? 0)} icon={Users} />
        <KpiCard
          title="Vehicle docs expiring"
          value={String(kpis?.expiringVehicleDocs ?? 0)}
          icon={(kpis?.expiringVehicleDocs ?? 0) > 0 ? AlertTriangle : Truck}
          accent={(kpis?.expiringVehicleDocs ?? 0) > 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sales vs purchases — last 12 months</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" fontSize={11} tickFormatter={(m: string) => m.slice(2)} />
                <YAxis fontSize={11} width={70} tickFormatter={(v: number) => v.toLocaleString()} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="purchases" name="Purchases" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top items — last 90 days</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topItems ?? []).map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell>
                      <span className="font-mono text-xs">{item.sku}</span> {item.name}
                    </TableCell>
                    <TableCell className="text-right">{money(item.revenue)}</TableCell>
                  </TableRow>
                ))}
                {(topItems ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground text-center">
                      No invoiced sales yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
