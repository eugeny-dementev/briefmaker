import {
  MarkdownView,
  Notice,
  Plugin,
  moment
} from "obsidian";
import { BriefmakerSettingsTab } from "./ui/SettingsTab";
import { BriefModal } from "./ui/BriefModal";
import {
  BriefmakerSettings,
  normalizeSettings
} from "./settings";
import { findMatchingRule } from "./ruleEngine";
import { renderTemplate } from "./templateRenderer";
import { extractUncheckedTasks } from "./taskExtractor";

interface BriefRenderResult {
  filePath: string;
  ruleName: string;
  tasks: string;
  rendered: string;
  content: string;
  selection: string;
}

export default class BriefmakerPlugin extends Plugin {
  settings!: BriefmakerSettings;
  private statusBar: HTMLElement | null = null;

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());

    this.addCommand({
      id: "copy-brief",
      name: "Briefmaker: Copy brief for current note",
      callback: () => void this.copyBriefForActiveFile()
    });

    this.addCommand({
      id: "open-preview",
      name: "Briefmaker: Open brief preview",
      callback: () => void this.openBriefPreview()
    });

    this.addSettingTab(new BriefmakerSettingsTab(this));

    this.statusBar = this.addStatusBarItem();
    this.statusBar.addClass("briefmaker-status");
    this.updateStatusBar();

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.updateStatusBar();
      })
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async copyBriefForActiveFile(): Promise<void> {
    const brief = await this.buildBrief();
    if (!brief) {
      return;
    }

    try {
      await this.copyToClipboard(brief.rendered);
      new Notice("Brief copied to clipboard.");
    } catch (error) {
      new Notice("Failed to copy brief.");
      console.error("Briefmaker copy failed", error);
    }
  }

  private async openBriefPreview(): Promise<void> {
    const brief = await this.buildBrief();
    if (!brief) {
      return;
    }

    const modal = new BriefModal(
      this.app,
      {
        filePath: brief.filePath,
        ruleName: brief.ruleName,
        tasksPreview: brief.tasks,
        renderedBrief: brief.rendered,
        content: brief.content,
        selection: brief.selection
      },
      {
        onCopy: async (text: string) => {
          await this.copyToClipboard(text);
        }
      }
    );

    modal.open();
  }

  private async buildBrief(): Promise<BriefRenderResult | null> {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new Notice("No active markdown file.");
      return null;
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = view?.editor;
    const selection = editor?.getSelection() ?? "";
    const content = await this.app.vault.cachedRead(file);
    const tasks = extractUncheckedTasks(content);

    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter
      ? JSON.stringify(cache.frontmatter, null, 2)
      : "";

    const filePath = file.path;
    const fileName = file.name;
    const dirPath = file.parent?.path ?? "";
    const vaultName = this.app.vault.getName();
    const date = moment().format("YYYY-MM-DD");

    const match = findMatchingRule(
      this.settings.rules,
      filePath,
      this.settings.defaultTemplate
    );
    const ruleName = match.rule?.name ?? "Default template";

    const vars = {
      filePath,
      fileName,
      dirPath,
      vaultName,
      content,
      selection,
      tasks,
      frontmatter,
      date
    };

    const rendered = renderTemplate(match.template, vars);

    return {
      filePath,
      ruleName,
      tasks,
      rendered,
      content,
      selection
    };
  }

  private updateStatusBar(): void {
    if (!this.statusBar) {
      return;
    }

    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      this.statusBar.setText("Briefmaker: no markdown file");
      return;
    }

    const match = findMatchingRule(
      this.settings.rules,
      file.path,
      this.settings.defaultTemplate
    );
    const ruleName = match.rule?.name ?? "Default template";
    this.statusBar.setText(`Briefmaker: ${ruleName}`);
    this.statusBar.onclick = () => {
      void this.openBriefPreview();
    };
  }

  private async copyToClipboard(text: string): Promise<void> {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const clipboard = (this.app as unknown as { clipboard?: { writeText: (value: string) => Promise<void> } }).clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}
