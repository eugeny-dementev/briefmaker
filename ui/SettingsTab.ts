import {
  FileSystemAdapter,
  Notice,
  PluginSettingTab,
  Setting,
  TFile,
  normalizePath
} from "obsidian";
import type BriefmakerPlugin from "../main";
import { createRule } from "../settings";
import { findMatchingRule, validateRegex } from "../ruleEngine";
import { renderTemplate } from "../templateRenderer";
import { extractUncheckedTasks } from "../taskExtractor";

export class BriefmakerSettingsTab extends PluginSettingTab {
  private plugin: BriefmakerPlugin;
  private testPath: string;
  private testRequestId = 0;
  private testContainer: HTMLElement | null = null;
  private testRefreshTimer: number | null = null;

  constructor(plugin: BriefmakerPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
    this.testPath = "";
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("briefmaker-settings");
    this.testContainer = null;
    if (this.testRefreshTimer !== null) {
      window.clearTimeout(this.testRefreshTimer);
      this.testRefreshTimer = null;
    }

    const defaultTemplateSetting = new Setting(containerEl)
      .setName("Default template")
      .setDesc("Used when no rule matches.")
      .addTextArea((text) => {
        text.setValue(this.plugin.settings.defaultTemplate);
        text.onChange(async (value) => {
          this.plugin.settings.defaultTemplate = value;
          await this.plugin.saveSettings();
          this.scheduleTemplateRefresh();
        });
        text.inputEl.rows = 10;
        text.inputEl.addClass("briefmaker-textarea");
      });
    defaultTemplateSetting.settingEl.addClass("briefmaker-template-setting");

    new Setting(containerEl).setName("Rules").setHeading();

    const rulesContainer = containerEl.createDiv("briefmaker-rules");

    this.plugin.settings.rules.forEach((rule, index) => {
      const ruleEl = rulesContainer.createDiv("briefmaker-rule");

      const header = new Setting(ruleEl)
        .setName(`Rule ${index + 1}`)
        .setDesc("First matching rule wins.");

      header.addText((text) => {
        text.setPlaceholder("Rule name");
        text.setValue(rule.name);
        text.onChange(async (value) => {
          rule.name = value;
          await this.plugin.saveSettings();
        });
      });

      header.addToggle((toggle) => {
        toggle.setValue(rule.enabled);
        toggle.onChange(async (value) => {
          rule.enabled = value;
          await this.plugin.saveSettings();
          this.refreshRuleTest();
        });
      });

      header.addExtraButton((button) => {
        button.setIcon("arrow-up");
        button.setTooltip("Move rule up");
        button.onClick(() => this.moveRule(index, -1));
      });

      header.addExtraButton((button) => {
        button.setIcon("arrow-down");
        button.setTooltip("Move rule down");
        button.onClick(() => this.moveRule(index, 1));
      });

      header.addExtraButton((button) => {
        button.setIcon("trash");
        button.setTooltip("Delete rule");
        button.onClick(() => this.removeRule(index));
      });

      const matcherSetting = new Setting(ruleEl)
        .setName("Matcher")
        .setDesc("Regex matcher only for the initial release.");
      matcherSetting.addDropdown((dropdown) => {
        dropdown.addOption("regex", "Regex");
        dropdown.setValue(rule.matcherType);
        dropdown.onChange(async (value) => {
          rule.matcherType = value as "regex";
          await this.plugin.saveSettings();
        });
      });

      const patternSetting = new Setting(ruleEl)
        .setName("Path pattern")
        .setDesc("Regex applied to the file path.");

      const errorEl = ruleEl.createDiv("briefmaker-rule-error");
      const refreshPatternError = (pattern: string) => {
        const patternError = validateRegex(pattern);
        if (patternError) {
          errorEl.textContent = `Pattern error: ${patternError}`;
          errorEl.classList.add("is-visible");
        } else {
          errorEl.textContent = "";
          errorEl.classList.remove("is-visible");
        }
      };

      patternSetting.addText((text) => {
        text.setPlaceholder(".*");
        text.setValue(rule.pattern);
        text.onChange(async (value) => {
          rule.pattern = value;
          refreshPatternError(value);
          await this.plugin.saveSettings();
          this.refreshRuleTest();
        });
      });

      refreshPatternError(rule.pattern);

      const templateSetting = new Setting(ruleEl)
        .setName("Template")
        .setDesc("Rendered when this rule matches.");
      templateSetting.addTextArea((text) => {
        text.setValue(rule.template);
        text.onChange(async (value) => {
          rule.template = value;
          await this.plugin.saveSettings();
          this.scheduleTemplateRefresh();
        });
        text.inputEl.rows = 8;
        text.inputEl.addClass("briefmaker-textarea");
      });
      templateSetting.settingEl.addClass("briefmaker-template-setting");
    });

    new Setting(containerEl)
      .setName("Add rule")
      .setDesc("Insert a new rule at the end of the list.")
      .addButton((button) => {
        button.setButtonText("Add");
        button.onClick(async () => {
          this.plugin.settings.rules.push(
            createRule(this.plugin.settings.defaultTemplate)
          );
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl).setName("Rule test").setHeading();
    const testSection = containerEl.createDiv("briefmaker-rule-test");
    this.testContainer = testSection;

    new Setting(testSection)
      .setName("Test file path")
      .setDesc("Preview the matching rule and rendered variables.")
      .addText((text) => {
        text.setPlaceholder("Project/Notes/Example.md");
        text.setValue(this.testPath);
        text.onChange((value) => {
          this.testPath = value;
          this.refreshRuleTest();
        });
      });

    void this.renderRuleTest(testSection);
  }

  private async renderRuleTest(container: HTMLElement): Promise<void> {
    const existing = container.querySelector(".briefmaker-rule-test-output");
    if (existing) {
      existing.remove();
    }

    const output = container.createDiv("briefmaker-rule-test-output");
    output.createEl("div", { text: "Loading..." });

    if (!this.testPath) {
      output.empty();
      output.createEl("div", { text: "Enter a file path to test." });
      return;
    }

    const requestId = (this.testRequestId += 1);
    const resolvedPath = this.resolveTestPath(this.testPath);
    const fileName = resolvedPath.split("/").pop() ?? "";
    const dirPath = resolvedPath.split("/").slice(0, -1).join("/");

    if (!resolvedPath) {
      output.empty();
      output.createEl("div", { text: "Enter a file path to test." });
      return;
    }

    let content = "";
    let tasks = "";
    let frontmatter = "";
    let fileFound = false;

    const abstractFile = this.app.vault.getAbstractFileByPath(resolvedPath);
    if (abstractFile instanceof TFile) {
      fileFound = true;
      content = await this.app.vault.cachedRead(abstractFile);
      tasks = extractUncheckedTasks(content);
      const cache = this.app.metadataCache.getFileCache(abstractFile);
      frontmatter = cache?.frontmatter
        ? JSON.stringify(cache.frontmatter, null, 2)
        : "";
    }

    if (requestId !== this.testRequestId) {
      return;
    }

    const match = findMatchingRule(
      this.plugin.settings.rules,
      resolvedPath,
      this.plugin.settings.defaultTemplate
    );

    const ruleName = match.rule?.name ?? "Default template";
    output.empty();
    output.createEl("div", { text: `Resolved path: ${resolvedPath}` });
    output.createEl("div", { text: `Matched rule: ${ruleName}` });
    if (!fileFound) {
      output.createEl("div", { text: "File not found in vault." });
    }

    const previewVars = {
      filePath: resolvedPath,
      fileName,
      dirPath,
      vaultName: this.app.vault.getName(),
      content,
      selection: "",
      tasks,
      frontmatter,
      date: new Date().toLocaleDateString()
    };

    const rendered = renderTemplate(match.template, previewVars);
    output.createEl("div", { text: "Extracted tasks" });
    const tasksPreview = output.createDiv("briefmaker-preview");
    tasksPreview.createEl("pre", {
      cls: "briefmaker-preview-pre",
      text: tasks || "(none)"
    });
    tasksPreview.createEl("button", {
      cls: "briefmaker-copy-button",
      text: "Copy"
    }).onclick = () => {
      void this.copyToClipboard(tasks || "");
    };

    output.createEl("div", { text: "Rendered preview" });
    const renderedPreview = output.createDiv("briefmaker-preview");
    renderedPreview.createEl("pre", {
      cls: "briefmaker-preview-pre",
      text: rendered
    });
    renderedPreview.createEl("button", {
      cls: "briefmaker-copy-button",
      text: "Copy"
    }).onclick = () => {
      void this.copyToClipboard(rendered);
    };
  }

  private scheduleTemplateRefresh(): void {
    if (!this.testContainer) {
      return;
    }
    if (this.testRefreshTimer !== null) {
      window.clearTimeout(this.testRefreshTimer);
    }
    this.testRefreshTimer = window.setTimeout(() => {
      void this.renderRuleTest(this.testContainer as HTMLElement);
    }, 1000);
  }

  private refreshRuleTest(): void {
    if (!this.testContainer) {
      return;
    }
    if (this.testRefreshTimer !== null) {
      window.clearTimeout(this.testRefreshTimer);
      this.testRefreshTimer = null;
    }
    void this.renderRuleTest(this.testContainer);
  }

  private resolveTestPath(input: string): string {
    let path = input.trim();
    if (!path) {
      return "";
    }

    path = normalizePath(path);
    const adapter = this.app.vault.adapter;

    if (adapter instanceof FileSystemAdapter) {
      const basePath = normalizePath(adapter.getBasePath());
      const pathLower = path.toLowerCase();
      const baseLower = basePath.toLowerCase();
      if (pathLower === baseLower) {
        return "";
      }
      if (pathLower.startsWith(`${baseLower}/`)) {
        path = path.slice(basePath.length);
      }
    }

    path = path.replace(/^\/+/, "");

    return path;
  }

  private async moveRule(index: number, delta: number): Promise<void> {
    const rules = this.plugin.settings.rules;
    const target = index + delta;
    if (target < 0 || target >= rules.length) {
      return;
    }

    const [rule] = rules.splice(index, 1);
    rules.splice(target, 0, rule);
    await this.plugin.saveSettings();
    this.display();
  }

  private async removeRule(index: number): Promise<void> {
    this.plugin.settings.rules.splice(index, 1);
    await this.plugin.saveSettings();
    this.display();
  }

  private async copyToClipboard(text: string): Promise<void> {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      new Notice("Copied to clipboard.");
      return;
    }
    const clipboard = (this.app as unknown as { clipboard?: { writeText: (value: string) => Promise<void> } }).clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(text);
      new Notice("Copied to clipboard.");
      return;
    }
    new Notice("Clipboard API not available.");
  }
}
