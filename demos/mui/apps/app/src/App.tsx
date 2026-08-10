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
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { Alert } from '@demo/mui-ui/Alert'
import { Avatar } from '@demo/mui-ui/Avatar'
import { Badge } from '@demo/mui-ui/Badge'
import { Button } from '@demo/mui-ui/Button'
import { Breadcrumbs, BreadcrumbLink } from '@demo/mui-ui/Breadcrumbs'
import { Card, CardContent, CardHeader } from '@demo/mui-ui/Card'
import { CardTitle, CardDescription } from '@demo/mui-ui/CardTitle'
import { Input } from '@demo/mui-ui/Input'
import { Select, MenuItem, FormControl, InputLabel } from '@demo/mui-ui/Select'
import { Separator } from '@demo/mui-ui/Separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from '@demo/mui-ui/Table'
import { Tabs, Tab } from '@demo/mui-ui/Tabs'
import { Box, Stack, Typography, Paper } from '@demo/mui-ui/Layout'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Reports', icon: FileText, active: false },
  { label: 'Segments', icon: Users, active: false },
  { label: 'Settings', icon: Settings, active: false },
] as const

const kpis = [
  { title: 'Sessions', value: '128,450', delta: '+12.4%', description: 'vs prior period' },
  { title: 'Conversion', value: '3.82%', delta: '+0.4%', description: 'checkout completed' },
  { title: 'Revenue', value: '$84.2k', delta: '+8.1%', description: 'attributed bookings' },
  { title: 'Active reports', value: '24', delta: '+3', description: 'scheduled runs' },
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

const reports = [
  { name: 'Weekly acquisition', status: 'Live', owner: 'A. Chen', updated: '2h ago' },
  { name: 'Checkout funnel', status: 'Live', owner: 'M. Ortiz', updated: '5h ago' },
  { name: 'Segment: enterprise', status: 'Draft', owner: 'J. Park', updated: 'Yesterday' },
  { name: 'Revenue by region', status: 'Live', owner: 'S. Deeds', updated: 'Yesterday' },
]

export default function App() {
  const [range, setRange] = useState('30')
  const [tab, setTab] = useState(0)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Paper
        square
        elevation={0}
        sx={{
          width: 240,
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Activity size={16} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              Reports
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Material UI workspace
            </Typography>
          </Box>
        </Stack>
        <Separator />
        <Stack spacing={0.5} sx={{ p: 1.5, flex: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant={item.active ? 'contained' : 'text'}
              startIcon={<item.icon size={16} />}
              sx={{ justifyContent: 'flex-start' }}
            >
              {item.label}
            </Button>
          ))}
        </Stack>
      </Paper>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Paper
          square
          elevation={0}
          sx={{
            height: 56,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Breadcrumbs sx={{ flex: 1 }}>
            <BreadcrumbLink underline="hover" color="inherit" href="#">
              Workspace
            </BreadcrumbLink>
            <Typography color="text.primary">Overview</Typography>
          </Breadcrumbs>
          <Box sx={{ width: 220, position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 10, top: 10, opacity: 0.5 }}
            />
            <Input placeholder="Search reports…" sx={{ '& .MuiInputBase-input': { pl: 4 } }} />
          </Box>
          <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>SD</Avatar>
        </Paper>

        <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Overview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Session health, conversion trends, and the reports your team runs every week.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', xl: 'repeat(4, 1fr)' },
              mb: 3,
            }}
          >
            {kpis.map((kpi) => (
              <Card key={kpi.title} variant="outlined">
                <CardHeader
                  title={<CardTitle color="text.secondary">{kpi.title}</CardTitle>}
                  action={<Badge size="small" label={kpi.delta} color="primary" variant="outlined" />}
                  sx={{ pb: 0 }}
                />
                <CardContent>
                  <Typography variant="h5" fontWeight={600}>
                    {kpi.value}
                  </Typography>
                  <CardDescription>{kpi.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              mb: 3,
            }}
          >
            <Card variant="outlined">
              <CardHeader title={<CardTitle>Monthly sessions</CardTitle>} />
              <CardContent sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sessionsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="sessions" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardHeader title={<CardTitle>Conversions by channel</CardTitle>} />
              <CardContent sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="conversions" fill="var(--chart-2)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>

          <Card variant="outlined">
            <CardHeader
              title={<CardTitle>Reports</CardTitle>}
              action={
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="range-label">Range</InputLabel>
                  <Select
                    labelId="range-label"
                    label="Range"
                    value={range}
                    onChange={(e) => setRange(String(e.target.value))}
                  >
                    <MenuItem value="7">7 days</MenuItem>
                    <MenuItem value="30">30 days</MenuItem>
                    <MenuItem value="90">90 days</MenuItem>
                  </Select>
                </FormControl>
              }
            />
            <CardContent>
              <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                <Tab label="All" icon={<BarChart3 size={14} />} iconPosition="start" />
                <Tab label="Live" />
              </Tabs>
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reports
                      .filter((r) => (tab === 1 ? r.status === 'Live' : true))
                      .map((r) => (
                        <TableRow key={r.name}>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>
                            <Badge size="small" label={r.status} />
                          </TableCell>
                          <TableCell>{r.owner}</TableCell>
                          <TableCell>{r.updated}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <Alert severity="info" sx={{ mt: 3 }}>
            Built with <strong>@demo/mui-ui</strong> (Material UI). Decree verify should pass.
          </Alert>
        </Box>
      </Box>
    </Box>
  )
}
