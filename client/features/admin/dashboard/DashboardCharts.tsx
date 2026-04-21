"use client"

import { formatCurrency } from "@/features/admin/adminUtils"

const CHART_COLORS = [
  "#00a8b5",
  "#003d5c",
  "#10b981",
  "#F59E0B",
  "#33bfc9",
  "#6366f1",
  "#ec4899",
  "#8b5cf6",
]

type CategorySalesPoint = {
  categoryName: string
  revenueTotal: number
  ordersCount: number
}

type DailySalesPoint = {
  dayLabel: string
  revenueTotal: number
  ordersCount: number
}

type AverageBasketByCategoryPoint = {
  categoryName: string
  averageBasket: number
  ordersCount: number
}

type CategorySalesPieChartProps = {
  data: CategorySalesPoint[]
  title: string
}

function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const startX = centerX + radius * Math.cos(startAngle)
  const startY = centerY + radius * Math.sin(startAngle)
  const endX = centerX + radius * Math.cos(endAngle)
  const endY = centerY + radius * Math.sin(endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0

  return [
    `M ${centerX} ${centerY}`,
    `L ${startX} ${startY}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
    "Z",
  ].join(" ")
}

export function CategorySalesPieChart({
  data,
  title,
}: CategorySalesPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.revenueTotal, 0)

  if (total === 0 || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Aucune vente sur la période.
      </div>
    )
  }

  const slices = data.reduce<
    {
      key: string
      path: string
      color: string
      label: string
      percentage: number
      amount: number
      nextAngle: number
    }[]
  >((accumulator, item, index) => {
    const startAngle =
      accumulator.length > 0
        ? accumulator[accumulator.length - 1].nextAngle
        : -Math.PI / 2
    const fraction = item.revenueTotal / total
    const sliceAngle = fraction * Math.PI * 2
    const endAngle = startAngle + sliceAngle

    const path =
      data.length === 1
        ? `M 100 100 m -80 0 a 80 80 0 1 0 160 0 a 80 80 0 1 0 -160 0`
        : describeArc(100, 100, 80, startAngle, endAngle)

    accumulator.push({
      key: item.categoryName,
      path,
      color: CHART_COLORS[index % CHART_COLORS.length],
      label: item.categoryName,
      percentage: Math.round(fraction * 100),
      amount: item.revenueTotal,
      nextAngle: endAngle,
    })

    return accumulator
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <svg
          viewBox="0 0 200 200"
          className="size-48"
          role="img"
          aria-label={title}
        >
          {slices.map((slice) => (
            <path
              key={slice.key}
              d={slice.path}
              fill={slice.color}
              stroke="#ffffff"
              strokeWidth="2"
            >
              <title>{`${slice.label}: ${formatCurrency(slice.amount)} (${slice.percentage}%)`}</title>
            </path>
          ))}
        </svg>
        <ul className="flex-1 space-y-2 text-sm">
          {slices.map((slice) => (
            <li key={slice.key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block size-3 rounded-sm"
                style={{ backgroundColor: slice.color }}
              />
              <span className="flex-1 text-slate-700">{slice.label}</span>
              <span className="font-mono text-xs text-slate-500">
                {slice.percentage}%
              </span>
              <span className="font-medium text-brand-nav">
                {formatCurrency(slice.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

type DailySalesBarChartProps = {
  data: DailySalesPoint[]
  title: string
}

export function DailySalesBarChart({ data, title }: DailySalesBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Aucune donnée.
      </div>
    )
  }

  const maxRevenue = Math.max(...data.map((item) => item.revenueTotal), 1)
  const chartWidth = 600
  const chartHeight = 240
  const paddingLeft = 50
  const paddingBottom = 40
  const innerWidth = chartWidth - paddingLeft - 20
  const innerHeight = chartHeight - paddingBottom - 20
  const barGap = 8
  const barWidth = (innerWidth - barGap * (data.length - 1)) / data.length

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        role="img"
        aria-label={title}
      >
        <line
          x1={paddingLeft}
          y1={20}
          x2={paddingLeft}
          y2={chartHeight - paddingBottom}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <line
          x1={paddingLeft}
          y1={chartHeight - paddingBottom}
          x2={chartWidth - 20}
          y2={chartHeight - paddingBottom}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartHeight - paddingBottom - innerHeight * ratio
          return (
            <g key={ratio}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - 20}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="2 4"
              />
              <text
                x={paddingLeft - 6}
                y={y + 3}
                fontSize="10"
                fill="#64748b"
                textAnchor="end"
              >
                {formatCurrency(maxRevenue * ratio)}
              </text>
            </g>
          )
        })}

        {data.map((item, index) => {
          const x = paddingLeft + index * (barWidth + barGap)
          const barHeight = (item.revenueTotal / maxRevenue) * innerHeight
          const y = chartHeight - paddingBottom - barHeight

          return (
            <g key={item.dayLabel}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#00a8b5"
                rx="2"
              >
                <title>{`${item.dayLabel}: ${formatCurrency(item.revenueTotal)} (${item.ordersCount} commandes)`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={chartHeight - paddingBottom + 14}
                fontSize="10"
                fill="#475569"
                textAnchor="middle"
              >
                {item.dayLabel}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

type AverageBasketBarChartProps = {
  data: AverageBasketByCategoryPoint[]
  title: string
}

export function AverageBasketBarChart({
  data,
  title,
}: AverageBasketBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-500">
        Aucune donnée.
      </div>
    )
  }

  const maxBasket = Math.max(...data.map((item) => item.averageBasket), 1)

  return (
    <div className="space-y-3" aria-label={title} role="img">
      <ul className="space-y-3">
        {data.map((item, index) => {
          const widthPercentage = (item.averageBasket / maxBasket) * 100

          return (
            <li key={item.categoryName} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-slate-700">
                  {item.categoryName}
                </span>
                <span className="shrink-0 font-medium text-brand-nav">
                  {formatCurrency(item.averageBasket)}
                </span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-slate-100"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${widthPercentage}%`,
                    backgroundColor:
                      CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {item.ordersCount} commande
                {item.ordersCount > 1 ? "s" : ""}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
