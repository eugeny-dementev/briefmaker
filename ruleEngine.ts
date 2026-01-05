import type { BriefmakerRule } from "./settings";

export interface RuleMatchResult {
  rule: BriefmakerRule | null;
  ruleIndex: number;
  template: string;
}

export function findMatchingRule(
  rules: BriefmakerRule[],
  filePath: string,
  fallbackTemplate: string
): RuleMatchResult {
  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i];
    if (!rule.enabled) {
      continue;
    }

    if (rule.matcherType !== "regex") {
      continue;
    }

    let regex: RegExp | null = null;
    try {
      regex = new RegExp(rule.pattern);
    } catch {
      regex = null;
    }

    if (regex && regex.test(filePath)) {
      return {
        rule,
        ruleIndex: i,
        template: rule.template
      };
    }
  }

  return {
    rule: null,
    ruleIndex: -1,
    template: fallbackTemplate
  };
}

export function validateRegex(pattern: string): string | null {
  if (!pattern) {
    return "Pattern is empty.";
  }

  try {
    new RegExp(pattern);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid regex pattern.";
  }
}
