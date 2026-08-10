import { useState } from 'react'
import {
  Activity,
  BarChart3,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'

import { Alert, AlertDescription, AlertTitle } from '@demo/shadcn-ui/alert'
import { Avatar, AvatarFallback } from '@demo/shadcn-ui/avatar'
import { Badge } from '@demo/shadcn-ui/badge'
import { Button } from '@demo/shadcn-ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@demo/shadcn-ui/breadcrumb'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@demo/shadcn-ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@demo/shadcn-ui/chart'
import { Input } from '@demo/shadcn-ui/input'
import { Select } from '@demo/shadcn-ui/select'
import { Separator } from '@demo/shadcn-ui/separator'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@demo/shadcn-ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@demo/shadcn-ui/tabs'
import { cn } from '@demo/shadcn-ui/utils'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Reports', icon: FileText, active: false },
  { label: 'Segments', icon: Users, active: false },
  { label: 'Settings', icon: Settings, active: false },
] as const

const kpis = [
  {
    title: 'Sessions',
    value: '128,450',
    delta: '+12.4%',
    description: 'vs prior period',
  },
  {
    title: 'Conversion',
    value: '3.82%',
    delta: '+0.4%',
    description: 'checkout completed',
  },
  {
    title: 'Revenue',
    value: '$84.2k',
    delta: '+8.1%',
    description: 'attributed bookings',
  },
  {
    title: 'Active reports',
    value: '24',
    delta: '+3',
    description: 'scheduled runs',
  },
] as const

const sessionsData = [
  { month: 'Jan', sessions: 18600 },
  { month: 'Feb', sessions: 20500 },
  { month: 'Mar', sessions: 22400 },
  { month: 'Apr', sessions: 19800 },
  { month: 'May', sessions: 24600 },
  { month: 'Jun', sessions: 27100 },
]

const channelData = [
  { channel: 'Organic', conversions: 420 },
  { channel: 'Paid', conversions: 310 },
  { channel: 'Email', conversions: 180 },
  { channel: 'Referral', conversions: 140 },
  { channel: 'Social', conversions: 95 },
]

const sessionsChartConfig = {
  sessions: {
    label: 'Sessions',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

const channelChartConfig = {
  conversions: {
    label: 'Conversions',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

const reports = [
  {
    name: 'Weekly acquisition',
    status: 'Live',
    owner: 'A. Chen',
    updated: '2h ago',
  },
  {
    name: 'Checkout funnel',
    status: 'Live',
    owner: 'M. Ortiz',
    updated: '5h ago',
  },
  {
    name: 'Segment: enterprise',
    status: 'Draft',
    owner: 'J. Park',
    updated: 'Yesterday',
  },
  {
    name: 'Revenue by region',
    status: 'Live',
    owner: 'S. Deeds',
    updated: 'Yesterday',
  },
  {
    name: 'Churn early warning',
    status: 'Paused',
    owner: 'R. Blake',
    updated: '3d ago',
  },
  {
    name: 'NPS pulse',
    status: 'Live',
    owner: 'A. Chen',
    updated: '4d ago',
  },
] as const

const segments = [
  { name: 'New visitors', size: '42.1k', share: '33%' },
  { name: 'Returning', size: '61.8k', share: '48%' },
  { name: 'Enterprise trial', size: '8.4k', share: '7%' },
  { name: 'Power users', size: '16.2k', share: '12%' },
] as const

function statusVariant(
  status: (typeof reports)[number]['status'],
): 'default' | 'secondary' | 'outline' {
  if (status === 'Live') return 'default'
  if (status === 'Draft') return 'secondary'
  return 'outline'
}

export default function App() {
  const [range, setRange] = useState('30')

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="flex items-center gap-2 px-4 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Pulse Reports</p>
            <p className="text-xs text-muted-foreground">Analytics workspace</p>
          </div>
        </div>
        <Separator />
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              className={cn(
                'w-full justify-start gap-2',
                item.active && 'bg-accent text-accent-foreground',
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="p-3 text-xs text-muted-foreground">v1.4 · workspace</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Workspace</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="relative w-56">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search reports…"
              type="search"
              aria-label="Search reports"
            />
          </div>
          <Avatar>
            <AvatarFallback>SD</AvatarFallback>
          </Avatar>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Session health, conversion trends, and the reports your team runs
              every week.
            </p>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <Card key={kpi.title}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </CardTitle>
                  <Badge variant="secondary">{kpi.delta}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tracking-tight">
                    {kpi.value}
                  </div>
                  <CardDescription className="mt-1">
                    {kpi.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly sessions</CardTitle>
                <CardDescription>
                  Unique sessions across all properties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={sessionsChartConfig}
                  className="aspect-auto h-64 w-full"
                >
                  <AreaChart
                    data={sessionsData}
                    margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={40}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      stroke="var(--color-sessions)"
                      fill="var(--color-sessions)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conversions by channel</CardTitle>
                <CardDescription>
                  Completed conversions in the selected range
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={channelChartConfig}
                  className="aspect-auto h-64 w-full"
                >
                  <BarChart
                    data={channelData}
                    margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="channel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={40}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="conversions"
                      fill="var(--color-conversions)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Tabs defaultValue="overview" className="w-full">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="segments">Segments</TabsTrigger>
                </TabsList>
                <Select
                  aria-label="Date range"
                  className="w-44"
                  value={range}
                  onChange={(event) => setRange(event.target.value)}
                >
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </Select>
              </div>

              <TabsContent value="overview" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent reports</CardTitle>
                    <CardDescription>
                      Last {range} days of scheduled and ad-hoc runs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableCaption>
                        Showing {reports.length} reports in this workspace
                      </TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Report</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report) => (
                          <TableRow key={report.name}>
                            <TableCell className="font-medium">
                              {report.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(report.status)}>
                                {report.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{report.owner}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {report.updated}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="segments" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Audience segments</CardTitle>
                    <CardDescription>
                      Composition for the last {range} days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Segment</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {segments.map((segment) => (
                          <TableRow key={segment.name}>
                            <TableCell className="font-medium">
                              {segment.name}
                            </TableCell>
                            <TableCell>{segment.size}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{segment.share}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <Alert className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <BarChart3 className="mt-0.5 size-4 shrink-0" />
              <div>
                <AlertTitle>Sync healthy</AlertTitle>
                <AlertDescription>
                  Warehouse sync completed 12 minutes ago. Export the current
                  overview snapshot when ready.
                </AlertDescription>
              </div>
            </div>
            <Button className="shrink-0 sm:ml-4">Export report</Button>
          </Alert>
        </main>
      </div>
    </div>
  )
}
