import type { BriefmakerRule } from "../settings";
import { findMatchingRule } from "../ruleEngine";

const fallback = "DEFAULT";

const makeRule = (pattern: string, template: string): BriefmakerRule => ({
  enabled: true,
  name: "rule",
  matcherType: "regex",
  pattern,
  template
});

const assertEqual = (actual: string, expected: string): void => {
  if (actual !== expected) {
    throw new Error(`Expected "${expected}", got "${actual}".`);
  }
};

{
  const rules = [makeRule("^Kanban.*Ticket.*md$", "KANBAN")];
  const result = findMatchingRule(
    rules,
    ["Kanban/Tickets/Task-1.md", "C:\\Vault\\Kanban\\Tickets\\Task-1.md"],
    fallback
  );
  assertEqual(result.template, "KANBAN");
}

{
  const rules = [makeRule("^C:/Vault/Notes/.*\\.md$", "ABSOLUTE")];
  const result = findMatchingRule(
    rules,
    ["Notes/Entry.md", "C:\\Vault\\Notes\\Entry.md"],
    fallback
  );
  assertEqual(result.template, "ABSOLUTE");
}

{
  const rules = [makeRule("^NoMatch$", "NOPE")];
  const result = findMatchingRule(
    rules,
    ["Kanban/Tickets/Task-2.md"],
    fallback
  );
  assertEqual(result.template, fallback);
}
