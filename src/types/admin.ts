export type ApiEnvelope<T> = {
  code: number;
  message: string;
  reason?: string;
  metadata?: Record<string, string>;
  data?: T;
};

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type DashboardStats = {
  total_users: number;
  today_new_users: number;
  active_users: number;
  total_api_keys: number;
  active_api_keys: number;
  total_accounts: number;
  normal_accounts: number;
  error_accounts: number;
  total_requests: number;
  total_cost: number;
  total_tokens: number;
  today_requests: number;
  today_cost: number;
  today_tokens: number;
  today_input_tokens?: number;
  today_output_tokens?: number;
  today_cache_read_tokens?: number;
  rpm: number;
  tpm: number;
};

export type TrendPoint = {
  date: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost: number;
  actual_cost: number;
};

export type DashboardTrend = {
  start_date: string;
  end_date: string;
  granularity: 'day' | 'hour' | string;
  trend: TrendPoint[];
};

export type ModelStat = {
  model: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  total_tokens: number;
  cost: number;
  actual_cost: number;
};

export type DashboardModelStats = {
  start_date: string;
  end_date: string;
  models: ModelStat[];
};

export type UsageStats = {
  total_requests?: number;
  total_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_cost?: number;
  total_actual_cost?: number;
  total_account_cost?: number;
  average_duration_ms?: number;
};

export type DashboardSnapshot = {
  trend?: TrendPoint[];
  models?: ModelStat[];
  groups?: Array<{
    group_id?: number;
    group_name?: string;
    requests?: number;
    total_tokens?: number;
    total_cost?: number;
    total_actual_cost?: number;
  }>;
};

export type AdminSettings = {
  site_name?: string;
  [key: string]: string | number | boolean | null | string[] | undefined;
};

export type AdminUser = {
  id: number;
  email: string;
  username?: string | null;
  balance?: number;
  concurrency?: number;
  status?: string;
  role?: string;
  current_concurrency?: number;
  notes?: string | null;
  last_used_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserUsageSummary = {
  total_requests?: number;
  total_tokens?: number;
  total_cost?: number;
  requests?: number;
  tokens?: number;
  cost?: number;
  [key: string]: string | number | boolean | null | undefined;
};

export type AdminApiKey = {
  id: number;
  user_id: number;
  key: string;
  name: string;
  group_id?: number | null;
  status: string;
  quota: number;
  quota_used: number;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
  usage_5h?: number;
  usage_1d?: number;
  usage_7d?: number;
  group?: AdminGroup;
  user?: {
    id: number;
    email?: string;
    username?: string | null;
  };
};

export type BalanceOperation = 'set' | 'add' | 'subtract';

export type AdminGroup = {
  id: number;
  name: string;
  description?: string | null;
  platform: string;
  rate_multiplier?: number;
  is_exclusive?: boolean;
  status?: string;
  subscription_type?: string;
  daily_limit_usd?: number | null;
  weekly_limit_usd?: number | null;
  monthly_limit_usd?: number | null;
  account_count?: number;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type AccountTodayStats = {
  requests: number;
  tokens: number;
  cost: number;
  standard_cost?: number;
  user_cost?: number;
};

export type AccountTestEvent = {
  type: string;
  text?: string;
  model?: string;
  status?: string;
  code?: string;
  image_url?: string;
  mime_type?: string;
  data?: JsonValue;
  success?: boolean;
  error?: string;
};

export type AccountTestResult = {
  success: boolean;
  model?: string;
  message: string;
  events: AccountTestEvent[];
};

export type AccountUsageHistory = {
  date: string;
  label: string;
  requests: number;
  tokens: number;
  cost: number;
  actual_cost: number;
  user_cost: number;
};

export type AccountUsageSummary = {
  days: number;
  actual_days_used: number;
  total_cost: number;
  total_user_cost: number;
  total_standard_cost: number;
  total_requests: number;
  total_tokens: number;
  avg_daily_cost: number;
  avg_daily_user_cost: number;
  avg_daily_requests: number;
  avg_daily_tokens: number;
  avg_duration_ms: number;
  today?: {
    date: string;
    cost: number;
    user_cost: number;
    requests: number;
    tokens: number;
  } | null;
  highest_cost_day?: {
    date: string;
    label: string;
    cost: number;
    user_cost: number;
    requests: number;
  } | null;
  highest_request_day?: {
    date: string;
    label: string;
    requests: number;
    cost: number;
    user_cost: number;
  } | null;
};

export type AccountUsageStatsResponse = {
  history: AccountUsageHistory[];
  summary: AccountUsageSummary;
  models: ModelStat[];
  endpoints?: Array<{ endpoint: string; requests: number; total_tokens: number; cost: number; actual_cost: number }>;
  upstream_endpoints?: Array<{ endpoint: string; requests: number; total_tokens: number; cost: number; actual_cost: number }>;
};

export type AccountModel = {
  id?: string;
  name?: string;
  model?: string;
  display_name?: string;
  object?: string;
  type?: string;
  created_at?: string;
  [key: string]: JsonValue | undefined;
};

export type AdminAccount = {
  id: number;
  name: string;
  platform: string;
  type: string;
  status?: string;
  schedulable?: boolean;
  priority?: number;
  concurrency?: number;
  current_concurrency?: number;
  load_factor?: number | null;
  rate_multiplier?: number;
  notes?: string | null;
  proxy_id?: number | null;
  proxy_fallback_origin_id?: number | null;
  proxy_fallback_origin_name?: string | null;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
  last_used_at?: string | null;
  expires_at?: number | null;
  auto_pause_on_expired?: boolean;
  rate_limited_at?: string | null;
  rate_limit_reset_at?: string | null;
  overload_until?: string | null;
  temp_unschedulable_until?: string | null;
  temp_unschedulable_reason?: string | null;
  session_window_start?: string | null;
  session_window_end?: string | null;
  session_window_status?: string | null;
  quota_limit?: number | null;
  quota_used?: number | null;
  quota_daily_limit?: number | null;
  quota_daily_used?: number | null;
  quota_weekly_limit?: number | null;
  quota_weekly_used?: number | null;
  current_window_cost?: number | null;
  active_sessions?: number | null;
  current_rpm?: number | null;
  group_ids?: number[];
  groups?: AdminGroup[];
  extra?: JsonObject;
};

export type AccountType = 'apikey' | 'oauth' | 'setup-token' | 'upstream' | 'bedrock' | 'service_account';

export type CreateAccountRequest = {
  name: string;
  platform: string;
  type: AccountType;
  credentials: Record<string, string | number | boolean | null | undefined>;
  extra?: JsonObject;
  notes?: string;
  proxy_id?: number;
  concurrency?: number;
  priority?: number;
  rate_multiplier?: number;
  load_factor?: number;
  group_ids?: number[];
  expires_at?: number;
  auto_pause_on_expired?: boolean;
  confirm_mixed_channel_risk?: boolean;
};

export type UpdateAccountRequest = {
  name?: string;
  platform?: string;
  type?: string;
  credentials?: Record<string, string | number | boolean | null | undefined>;
  extra?: JsonObject;
  notes?: string;
  proxy_id?: number;
  concurrency?: number;
  priority?: number;
  rate_multiplier?: number;
  load_factor?: number;
  group_ids?: number[];
  expires_at?: number;
  auto_pause_on_expired?: boolean;
  confirm_mixed_channel_risk?: boolean;
  status?: string;
  schedulable?: boolean;
};

export type CreateUserRequest = {
  email: string;
  password: string;
  username?: string;
  notes?: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'disabled';
  balance?: number;
  concurrency?: number;
  [key: string]: string | number | boolean | null | undefined;
};
