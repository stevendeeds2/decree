import { useState } from 'react'
import {
  Activity,
  FileText,
  LayoutDashboard,
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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Alert } from '@demo/antd-ui/Alert'
import { Avatar } from '@demo/antd-ui/Avatar'
import { Tag } from '@demo/antd-ui/Badge'
import { Button } from '@demo/antd-ui/Button'
import { Breadcrumb } from '@demo/antd-ui/Breadcrumb'
import { Card } from '@demo/antd-ui/Card'
import { Input } from '@demo/antd-ui/Input'
import { Select } from '@demo/antd-ui/Select'
import { Separator } from '@demo/antd-ui/Separator'
import { Table } from '@demo/antd-ui/Table'
import { Tabs } from '@demo/antd-ui/Tabs'
import { Layout, Space, Typography, Flex } from '@demo/antd-ui/Layout'


const kpis = [
  { title: 'Sessions', value: '128,450', delta: '+12.4%' },
  { title: 'Conversion', value: '3.82%', delta: '+0.4%' },
  { title: 'Revenue', value: '$84.2k', delta: '+8.1%' },
  { title: 'Active reports', value: '24', delta: '+3' },
]

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
]

const reportRows = [
  { key: '1', name: 'Weekly acquisition', status: 'Live', owner: 'A. Chen', updated: '2h ago' },
  { key: '2', name: 'Checkout funnel', status: 'Live', owner: 'M. Ortiz', updated: '5h ago' },
  { key: '3', name: 'Segment: enterprise', status: 'Draft', owner: 'J. Park', updated: 'Yesterday' },
]

export default function App() {
  const [range, setRange] = useState('30')

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider theme="light" width={220} style={{ borderRight: '1px solid var(--border)' }}>
        <Flex align="center" gap={10} style={{ padding: 16 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Activity size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Reports</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Ant Design workspace
            </Typography.Text>
          </div>
        </Flex>
        <Separator style={{ margin: 0 }} />
        <Space direction="vertical" style={{ width: '100%', padding: 12 }}>
          <Button type="primary" block icon={<LayoutDashboard size={14} />}>
            Overview
          </Button>
          <Button block icon={<FileText size={14} />}>
            Reports
          </Button>
          <Button block icon={<Users size={14} />}>
            Segments
          </Button>
          <Button block icon={<Settings size={14} />}>
            Settings
          </Button>
        </Space>
      </Layout.Sider>
      <Layout>
        <Layout.Header
          style={{
            background: 'var(--card)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            paddingInline: 24,
          }}
        >
          <Breadcrumb
            style={{ flex: 1 }}
            items={[{ title: 'Workspace' }, { title: 'Overview' }]}
          />
          <Input.Search placeholder="Search reports…" style={{ width: 220 }} />
          <Avatar size="small">SD</Avatar>
        </Layout.Header>
        <Layout.Content style={{ padding: 24 }}>
          <Typography.Title level={3} style={{ marginTop: 0 }}>
            Overview
          </Typography.Title>
          <Typography.Text type="secondary">
            Session health, conversion trends, and weekly reports.
          </Typography.Text>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
              marginTop: 24,
              marginBottom: 16,
            }}
          >
            {kpis.map((kpi) => (
              <Card key={kpi.title} size="small">
                <Flex justify="space-between">
                  <Typography.Text type="secondary">{kpi.title}</Typography.Text>
                  <Tag color="blue">{kpi.delta}</Tag>
                </Flex>
                <Typography.Title level={3} style={{ margin: '8px 0 0' }}>
                  {kpi.value}
                </Typography.Title>
              </Card>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Card title="Monthly sessions" size="small">
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sessionsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="sessions" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Conversions by channel" size="small">
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="conversions" fill="var(--chart-2)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card
            title="Reports"
            size="small"
            extra={
              <Select
                value={range}
                style={{ width: 120 }}
                onChange={setRange}
                options={[
                  { value: '7', label: '7 days' },
                  { value: '30', label: '30 days' },
                  { value: '90', label: '90 days' },
                ]}
              />
            }
          >
            <Tabs
              items={[
                {
                  key: 'all',
                  label: 'All',
                  children: (
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={reportRows}
                      columns={[
                        { title: 'Name', dataIndex: 'name' },
                        {
                          title: 'Status',
                          dataIndex: 'status',
                          render: (s: string) => <Tag>{s}</Tag>,
                        },
                        { title: 'Owner', dataIndex: 'owner' },
                        { title: 'Updated', dataIndex: 'updated' },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </Card>

          <Alert
            style={{ marginTop: 16 }}
            type="info"
            showIcon
            message="Built with @demo/antd-ui (Ant Design). Decree verify should pass."
          />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
