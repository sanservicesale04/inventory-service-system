import {
  Home,
  Package,
  ArrowLeftRight,
  Wrench,
  Users,
  History,
} from 'lucide-react'

/**
 * โครงสร้างเมนูทั้งหมดของระบบ
 * roles: ['admin', 'user', 'technician'] -> ใครเห็นเมนูนี้ได้บ้าง
 * Technician เห็นเฉพาะ "งานบริการ" ตามสเปก
 */
export const navConfig = [
  {
    key: 'home',
    labelKey: 'menuHome',
    icon: Home,
    path: '/dashboard',
    roles: ['admin', 'user', 'technician'],
  },
  {
    key: 'products',
    labelKey: 'menuProducts',
    icon: Package,
    path: '/products',
    roles: ['admin', 'user'],
  },
  {
    key: 'stock',
    labelKey: 'menuStockTransactions',
    icon: ArrowLeftRight,
    roles: ['admin', 'user'],
    children: [
      { key: 'stock-add-product', labelKey: 'stockAddProduct', path: '/stock/add-product' },
      { key: 'stock-receive', labelKey: 'stockReceive', path: '/stock/receive' },
      { key: 'stock-issue', labelKey: 'stockIssue', path: '/stock/issue' },
      { key: 'stock-borrow', labelKey: 'stockBorrow', path: '/stock/borrow' },
    ],
  },
  {
    key: 'services',
    labelKey: 'menuServices',
    icon: Wrench,
    roles: ['admin', 'user', 'technician'],
    children: [
      { key: 'services-all', labelKey: 'serviceAllJobs', path: '/services/all' },
      { key: 'services-add', labelKey: 'serviceAddJob', path: '/services/add' },
      { key: 'services-cal-fire-alarm', labelKey: 'serviceCalendarFireAlarm', path: '/services/calendar/fire-alarm' },
      { key: 'services-cal-fire-pump', labelKey: 'serviceCalendarFirePump', path: '/services/calendar/fire-pump' },
      { key: 'services-cal-lightning', labelKey: 'serviceCalendarLightning', path: '/services/calendar/lightning' },
      { key: 'services-cal-delivery', labelKey: 'serviceCalendarDelivery', path: '/services/calendar/delivery' },
    ],
  },
  {
    key: 'approvals',
    labelKey: 'menuApprovals',
    icon: History,
    path: '/approvals',
    roles: ['admin'],
  },
  {
    key: 'accounts',
    labelKey: 'menuAccountManagement',
    icon: Users,
    path: '/accounts',
    roles: ['admin'],
  },
  {
    key: 'activity-logs',
    labelKey: 'menuActivityLogs',
    icon: History,
    path: '/activity-logs',
    roles: ['admin'],
  },
]

export function getVisibleNav(role) {
  if (!role) return []
  return navConfig.filter((item) => item.roles.includes(role))
}
