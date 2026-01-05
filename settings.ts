export type MatcherType = "regex";

export interface BriefmakerRule {
  enabled: boolean;
  name: string;
  matcherType: MatcherType;
  pattern: string;
  template: string;
}

export interface BriefmakerSettings {
  defaultTemplate: string;
  rules: BriefmakerRule[];
}

export const DEFAULT_TEMPLATE = `You are an external code agent. Read the note content and tasks below, then propose concrete code changes.

Requirements:
- Treat unchecked tasks as required work items.
- Produce actionable edits with updated markdown to paste back into the note.
- Check off completed tasks and include an "## Actions Taken" section.
- Do not run tools or modify files automatically.

Context:
File: {{filePath}}
Vault: {{vaultName}}
Date: {{date}}

Frontmatter:
{{frontmatter}}

Unchecked tasks:
{{tasks}}

Note content:
{{content}}
`;

export const DEFAULT_SETTINGS: BriefmakerSettings = {
  defaultTemplate: DEFAULT_TEMPLATE,
  rules: [
    {
      enabled: true,
      name: "Default rule",
      matcherType: "regex",
      pattern: ".*",
      template: DEFAULT_TEMPLATE
    }
  ]
};

export function normalizeSettings(
  settings: Partial<BriefmakerSettings> | null | undefined
): BriefmakerSettings {
  const merged: BriefmakerSettings = {
    defaultTemplate: settings?.defaultTemplate ?? DEFAULT_SETTINGS.defaultTemplate,
    rules: (settings?.rules ?? DEFAULT_SETTINGS.rules).map((rule) => ({
      enabled: rule.enabled ?? true,
      name: rule.name ?? "Unnamed rule",
      matcherType: rule.matcherType ?? "regex",
      pattern: rule.pattern ?? "",
      template: rule.template ?? DEFAULT_SETTINGS.defaultTemplate
    }))
  };

  if (merged.rules.length === 0) {
    merged.rules = [...DEFAULT_SETTINGS.rules];
  }

  return merged;
}

export function createRule(template?: string): BriefmakerRule {
  return {
    enabled: true,
    name: "New rule",
    matcherType: "regex",
    pattern: "",
    template: template ?? DEFAULT_SETTINGS.defaultTemplate
  };
}
