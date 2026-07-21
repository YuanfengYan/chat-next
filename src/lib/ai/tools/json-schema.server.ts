import "server-only";

type JsonSchema = Record<string, unknown>;

function valueType(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

/** 运行时使用的受限 JSON Schema 校验器，覆盖工具配置允许的结构与约束。 */
export function validateJsonSchemaValue(schema: JsonSchema, value: unknown, path = "$"): string[] {
  const errors: string[] = [];
  const allowedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  const actual = valueType(value);
  if (allowedTypes.length && !allowedTypes.includes(actual) && !(actual === "integer" && allowedTypes.includes("number"))) {
    return [`${path} 应为 ${allowedTypes.join("/")}，实际为 ${actual}`];
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) errors.push(`${path} 不在允许值中`);
  if ("const" in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) errors.push(`${path} 不符合固定值`);
  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength) errors.push(`${path} 长度不足`);
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) errors.push(`${path} 长度超限`);
    if (typeof schema.pattern === "string") {
      try { if (!new RegExp(schema.pattern).test(value)) errors.push(`${path} 格式不匹配`); } catch { errors.push(`${path} 的 pattern 无效`); }
    }
  }
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) errors.push(`${path} 小于最小值`);
    if (typeof schema.maximum === "number" && value > schema.maximum) errors.push(`${path} 超过最大值`);
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) errors.push(`${path} 元素不足`);
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) errors.push(`${path} 元素过多`);
    if (schema.items && typeof schema.items === "object") value.forEach((item, index) => errors.push(...validateJsonSchemaValue(schema.items as JsonSchema, item, `${path}[${index}]`)));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const properties = schema.properties && typeof schema.properties === "object" ? schema.properties as Record<string, JsonSchema> : {};
    const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === "string") : [];
    for (const key of required) if (!(key in record)) errors.push(`${path}.${key} 为必填项`);
    for (const [key, item] of Object.entries(record)) {
      if (properties[key]) errors.push(...validateJsonSchemaValue(properties[key], item, `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${path}.${key} 不允许出现`);
    }
  }
  return errors;
}

export function assertJsonSchemaValue(schema: JsonSchema, value: unknown, code: string) {
  const errors = validateJsonSchemaValue(schema, value);
  if (errors.length) throw new Error(`${code}:${errors.slice(0, 5).join("；")}`);
}

