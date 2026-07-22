export type AdminRole = "admin" | "user";

export type AdminNavIcon =
  | "dashboard"
  | "tool"
  | "list"
  | "shield"
  | "logs"
  | "settings"
  | "assistant"
  | "prompt"
  | "sliders"
  | "link"
  | "database";

export interface AdminNavItem {
  title: string;
  icon: AdminNavIcon;
  href?: string;
  disabled?: boolean;
  children?: AdminNavItem[];
}

export interface AdminViewer {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  roles: string[];
  isAdmin: boolean;
}

export interface AdminMetric {
  label: string;
  value: string;
  hint: string;
}

export interface AdminDashboardOverview {
  metrics: AdminMetric[];
  recentTools: AdminToolListItem[];
  recentSessions: AdminSessionListItem[];
}

export interface AdminToolListItem {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  versions: number;
  modelBindings: number;
  updatedAt: string;
}

export interface AdminToolPermissionItem {
  id: string;
  toolName: string;
  toolKey: string;
  enabledModels: number;
  disabledModels: number;
  latestVersionStatus: string;
}

export interface AdminToolInvocationLogItem {
  id: string;
  toolName: string;
  callId: string;
  status: string;
  durationMs: string;
  createdAt: string;
  errorMessage: string;
}

export interface AdminToolRuntimeConfigItem {
  id: string;
  toolName: string;
  version: number;
  method: string;
  endpoint: string;
  timeoutMs: number;
  maxResponseBytes: number;
  status: string;
}

export interface AdminSessionListItem {
  id: string;
  title: string;
  owner: string;
  model: string;
  status: string;
  messages: number;
  generations: number;
  updatedAt: string;
}

export interface AdminAssistantListItem {
  id: string;
  key: string;
  name: string;
  description: string;
  versions: number;
  updatedAt: string;
}

export interface AdminPromptConfigItem {
  id: string;
  assistantName: string;
  version: number;
  status: string;
  variables: number;
  createdAt: string;
}

export interface AdminModelParameterItem {
  id: string;
  provider: string;
  modelName: string;
  contextWindow: string;
  maxOutputTokens: string;
  toolBindings: number;
  enabled: boolean;
}

export interface AdminToolBindingItem {
  id: string;
  modelName: string;
  toolName: string;
  enabled: boolean;
}

export interface AdminKnowledgeBindingItem {
  id: string;
  assistantName: string;
  knowledgeBase: string;
  status: string;
}
