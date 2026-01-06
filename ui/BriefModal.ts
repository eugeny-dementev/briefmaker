import { App, Modal, Notice } from "obsidian";

export interface BriefModalData {
  filePath: string;
  ruleName: string;
  tasksPreview: string;
  renderedBrief: string;
  content: string;
  selection: string;
}

export interface BriefModalActions {
  onCopy: (text: string) => Promise<void>;
}

export class BriefModal extends Modal {
  private data: BriefModalData;
  private actions: BriefModalActions;

  constructor(app: App, data: BriefModalData, actions: BriefModalActions) {
    super(app);
    this.data = data;
    this.actions = actions;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("briefmaker-modal");

    contentEl.createEl("h2", { text: "Brief preview" });

    const metaEl = contentEl.createDiv("briefmaker-meta");
    metaEl.createEl("div", {
      text: `File: ${this.data.filePath || "No active file"}`
    });
    metaEl.createEl("div", {
      text: `Rule: ${this.data.ruleName}`
    });

    const tasksEl = contentEl.createDiv("briefmaker-section");
    tasksEl.createEl("h3", { text: "Unchecked tasks" });
    const tasksPreview = tasksEl.createDiv("briefmaker-preview");
    tasksPreview.createEl("pre", {
      cls: "briefmaker-preview-pre",
      text: this.data.tasksPreview || "(none)"
    });
    tasksPreview.createEl("button", {
      cls: "briefmaker-copy-button",
      text: "Copy"
    }).onclick = () => {
      void this.handleCopy(this.data.tasksPreview || "");
    };

    const briefEl = contentEl.createDiv("briefmaker-section");
    briefEl.createEl("h3", { text: "Rendered brief" });
    const briefPreview = briefEl.createDiv("briefmaker-preview");
    briefPreview.createEl("pre", {
      cls: "briefmaker-preview-pre",
      text: this.data.renderedBrief
    });
    briefPreview.createEl("button", {
      cls: "briefmaker-copy-button",
      text: "Copy"
    }).onclick = () => {
      void this.handleCopy(this.data.renderedBrief);
    };

    const buttonRow = contentEl.createDiv("briefmaker-buttons");
    buttonRow.createEl("button", { text: "Copy" }).onclick = () => {
      void this.handleCopy(this.data.renderedBrief);
    };
    buttonRow.createEl("button", { text: "Copy + content" }).onclick = () => {
      const combined = [
        this.data.renderedBrief,
        "",
        "---",
        "",
        "Full note content:",
        "",
        this.data.content
      ].join("\n");
      void this.handleCopy(combined);
    };
    buttonRow.createEl("button", { text: "Copy + selection" }).onclick = () => {
      const combined = [
        this.data.renderedBrief,
        "",
        "---",
        "",
        "Selection:",
        "",
        this.data.selection || "(none)"
      ].join("\n");
      void this.handleCopy(combined);
    };
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async handleCopy(text: string): Promise<void> {
    await this.actions.onCopy(text);
    new Notice("Brief copied to clipboard.");
  }
}
