export type TemplateVars = Record<string, string>;

const VAR_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(VAR_REGEX, (_, key: string) => vars[key] ?? "");
}
