export interface DashboardMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversations: number; // Tổng mess
  leads: number; // Tổng data
  ctr: number;
  cpc: number;
  cpr: number; // Cost per result (mess or lead)
  conversionRate: number; // Tỷ lệ chuyển đổi
}

export interface ChartDataPoint {
  time: string;
  spend: number;
  messages: number;
  leads: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  spend: number;
  results: number;
  cpr: number;
}

export interface AdAccount {
  id: string;
  name: string;
  currency: string;
  account_status: number; // 1=Active, 2=Disabled, etc.
}

export enum TimeRange {
  TODAY = 'Hôm nay',
  YESTERDAY = 'Hôm qua',
  LAST_7_DAYS = '7 ngày qua',
  THIS_MONTH = 'Tháng này'
}