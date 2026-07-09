export function formatAdminDateTime(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function countJsonObjectKeys(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).length : 0;
}
