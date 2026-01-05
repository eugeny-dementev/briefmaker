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

export const DEFAULT_TEMPLATE = `You are an AI coding agent working with an Obsidian task note.

This note is the source of truth.
You must preserve its structure, style, and intent.

------------------------------------
Context
- Vault: {{vaultName}}
- File: {{filePath}}
- Date: {{date}}
------------------------------------

Your job
1. Read the entire note carefully.
2. Treat unchecked tasks ("- [ ]") as the required work items.
3. Execute tasks one by one.
4. AFTER completing a task, update the SAME note at {{filePath}} by:
   - marking the task as completed ("- [x]")
   - appending detailed entries to the "# Process" section.

DO NOT:
- reorder tasks
- rewrite task text
- check tasks that are not fully completed
- remove existing Process entries
- change formatting style

------------------------------------
How to write Process entries (IMPORTANT)
------------------------------------

For each completed task, append entries to "# Process" using this style:

- Describe what was done chronologically.
- If anything went wrong, explicitly mark it as:

  **Issue**: what failed / was unclear / broke
  **Solution**: what was changed
  **Why**: why this solution works (root cause explanation)

Rules:
- Every non-trivial task MUST include reasoning ("Why").
- Keep explanations technical and concrete.
- Write for future-you debugging this months later.
- Include commands, config changes, code behavior, and constraints when relevant.
- If links are relevant, include them inline.

If a task cannot be completed:
- Leave it unchecked
- Append a Process entry:
  **Issue**: why it is blocked
  **Status**: Blocked
  **Next step**: what would unblock it

------------------------------------
Unchecked tasks extracted from the note:
{{tasks}}

------------------------------------
Full note content:
---
{{content}}
---
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
