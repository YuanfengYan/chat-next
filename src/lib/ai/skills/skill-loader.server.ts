import "server-only";
import { readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { SKILL_TOOL_NAMES } from "@/lib/ai/skills/skill-tools.server";

const metadataSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tools: z.array(z.string().min(1)).max(10).default([]),
});
export interface LoadedSkill extends z.infer<typeof metadataSchema> { instructions: string; }

function parseSkillMarkdown(markdown: string): LoadedSkill {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/u.exec(markdown);
  if (!match) throw new Error("INVALID_SKILL_MARKDOWN");
  const metadata: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/u)) {
    const entry = /^([a-zA-Z][\w-]*):\s*(.*)$/u.exec(line);
    if (!entry) throw new Error("INVALID_SKILL_FRONTMATTER");
    const [, key, rawValue] = entry;
    metadata[key] = key === "tools"
      ? rawValue.replace(/^\[|\]$/gu, "").split(",").map((value) => value.trim()).filter(Boolean)
      : rawValue.trim();
  }
  const parsed = metadataSchema.parse(metadata);
  if (parsed.tools.some((name) => !SKILL_TOOL_NAMES.has(name))) throw new Error("UNKNOWN_SKILL_TOOL");
  return { ...parsed, instructions: match[2].trim() };
}

/** 从固定根目录加载并校验 Skill，阻止软链接或路径逃逸。 */
export class SkillLoader {
  private cache: Promise<readonly LoadedSkill[]> | undefined;
  constructor(private readonly root = path.join(process.cwd(), "skills")) {}

  loadAll(): Promise<readonly LoadedSkill[]> { return this.cache ??= this.readAll(); }
  clearCache() { this.cache = undefined; }

  private async readAll(): Promise<readonly LoadedSkill[]> {
    const root = await realpath(this.root);
    const entries = await readdir(root, { withFileTypes: true });
    const skills: LoadedSkill[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const filename = path.join(root, entry.name, "SKILL.md");
      let resolved: string;
      try { resolved = await realpath(filename); } catch { continue; }
      if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("SKILL_PATH_OUTSIDE_ROOT");
      skills.push(parseSkillMarkdown(await readFile(resolved, "utf8")));
    }
    if (new Set(skills.map((skill) => skill.id)).size !== skills.length) throw new Error("DUPLICATE_SKILL_ID");
    return skills.sort((a, b) => a.id.localeCompare(b.id));
  }
}

export { parseSkillMarkdown };
