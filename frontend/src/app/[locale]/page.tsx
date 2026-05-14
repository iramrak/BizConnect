/**
 * CleanDerect CRM — Dashboard
 *
 * Features:
 * - Metric cards: total deals, revenue, clients, active tasks
 * - BarChart: deals by stage (Recharts)
 * - Skeleton loader
 * - Auto-refresh on Zustand version changes
 * - i18n via useTranslations('Dashboard')
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Handshake,
  DollarSign,
  Users,
  ListTodo,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { useTranslations, useLocale } from "next-intl";
import api from "@/lib/api";
import { useCRMStore } from "@/lib/store";

/* ── Types ───────────────────────────────── */

interface StageData {
  name: string;
  key: string;
  value: number;
}

interface DashboardData {
  total_deals: number;
  total_revenue: number;
  deals_by_stage: StageData[];
  total_clients: number;
  active_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
}

/* ── Stage colors ────────────────────────── */

const STAGE_COLORS: Record<string, string> = {
  new: "#38bdf8",
  in_progress: "#f59e0b",
  proposal: "#8b5cf6",
  negotiation: "#f97316",
  payment: "#3b82f6",
  closed_won: "#10b981",
  closed_lost: "#ef4444",
};

const PIE_COLORS = ["#38bdf8", "#f59e0b", "#8b5cf6", "#f97316", "#3b82f6", "#10b981", "#ef4444"];

/* ── Page ────────────────────────────────── */

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<DashboardData>("/dashboard/");
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh when deals/tasks/clients change
  const dealsVersion = useCRMStore((s) => s.dealsVersion);
  const tasksVersion = useCRMStore((s) => s.tasksVersion);
  const clientsVersion = useCRMStore((s) => s.clientsVersion);
  useEffect(() => {
    if (dealsVersion > 0 || tasksVersion > 0 || clientsVersion > 0) {
      fetchDashboard();
    }
  }, [dealsVersion, tasksVersion, clientsVersion, fetchDashboard]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10">
            <LayoutDashboard className="w-6 h-6 text-violet-400" />
          </div>
          {t("title")}
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          {t("subtitle")}
        </p>
      </div>

      {/* ── Metric Cards ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={Handshake}
          label={t("totalDeals")}
          value={data?.total_deals}
          loading={loading}
          color="text-indigo-400"
          bg="bg-indigo-500/10"
          borderColor="border-indigo-500/20"
          locale={locale}
        />
        <MetricCard
          icon={DollarSign}
          label={t("budget")}
          value={data?.total_revenue}
          loading={loading}
          format="money"
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          borderColor="border-emerald-500/20"
          locale={locale}
        />
        <MetricCard
          icon={Users}
          label={t("clients")}
          value={data?.total_clients}
          loading={loading}
          color="text-cyan-400"
          bg="bg-cyan-500/10"
          borderColor="border-cyan-500/20"
          locale={locale}
        />
        <MetricCard
          icon={ListTodo}
          label={t("activeTasks")}
          value={data?.active_tasks}
          loading={loading}
          color="text-amber-400"
          bg="bg-amber-500/10"
          borderColor="border-amber-500/20"
          locale={locale}
        />
      </div>

      {/* ── Sub-stats ──────────────────────── */}
      {data && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <MiniStat
            icon={CheckCircle2}
            label={t("completedTasks")}
            value={data.completed_tasks}
            color="text-emerald-400"
            locale={locale}
          />
          <MiniStat
            icon={AlertTriangle}
            label={t("overdueTasks")}
            value={data.overdue_tasks}
            color={data.overdue_tasks > 0 ? "text-red-400" : "text-slate-500"}
            locale={locale}
          />
          <MiniStat
            icon={TrendingUp}
            label={t("conversionRate")}
            value={
              data.total_deals > 0
                ? `${Math.round(
                  ((data.deals_by_stage.find((s) => s.key === "closed_won")?.value || 0) /
                    data.total_deals) *
                  100
                )}%`
                : "—"
            }
            color="text-violet-400"
            locale={locale}
          />
        </div>
      )}

      {/* ── Charts ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Handshake className="w-4 h-4 text-indigo-400" />
            {t("dealsByStage")}
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
          ) : data && data.deals_by_stage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.deals_by_stage}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(51, 65, 85, 0.4)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(51, 65, 85, 0.4)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid rgba(51, 65, 85, 0.5)",
                    borderRadius: "0.75rem",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                  cursor={{ fill: "rgba(51, 65, 85, 0.2)" }}
                  formatter={(value) => [`${value}`, t("dealsCount")]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {data.deals_by_stage.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={STAGE_COLORS[entry.key] || "#6366f1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
              {t("noData")}
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            {t("funnelDistribution")}
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
          ) : data && data.deals_by_stage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.deals_by_stage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  strokeWidth={2}
                  stroke="#0f172a"
                >
                  {data.deals_by_stage.map((entry, index) => (
                    <Cell
                      key={entry.key}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid rgba(51, 65, 85, 0.5)",
                    borderRadius: "0.75rem",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                  formatter={(value) => [`${value}`, t("dealsCount")]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-slate-300 text-xs ml-1">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
              {t("noData")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── MetricCard ──────────────────────────── */

function MetricCard({
  icon: Icon,
  label,
  value,
  loading,
  format,
  color,
  bg,
  borderColor,
  locale,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  loading: boolean;
  format?: "money";
  color: string;
  bg: string;
  borderColor: string;
  locale: string;
}) {
  const displayValue =
    value === undefined
      ? "—"
      : format === "money"
        ? formatMoney(value, locale)
        : value.toLocaleString(locale);

  return (
    <div
      className={`bg-slate-800/30 border ${borderColor} rounded-2xl p-5 hover:bg-slate-800/50 transition-all duration-200`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-7 w-24 bg-slate-700 rounded" />
          <div className="h-4 w-20 bg-slate-700/60 rounded" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-white mb-0.5">
            {displayValue}
            {format === "money" && (
              <span className="text-sm font-normal text-slate-500 ml-1.5">₸</span>
            )}
          </p>
          <p className="text-sm text-slate-400">{label}</p>
        </>
      )}
    </div>
  );
}

/* ── MiniStat ────────────────────────────── */

function MiniStat({
  icon: Icon,
  label,
  value,
  color,
  locale,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  locale: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-slate-800/20 border border-slate-700/30 rounded-xl px-4 py-3">
      <Icon className={`w-4 h-4 ${color} shrink-0`} />
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`ml-auto text-sm font-semibold ${color}`}>
        {typeof value === "number" ? value.toLocaleString(locale) : value}
      </span>
    </div>
  );
}

/* ── Helpers ─────────────────────────────── */

function formatMoney(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(value);
}
