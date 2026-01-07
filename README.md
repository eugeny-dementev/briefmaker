# Briefmaker

Briefmaker is an Obsidian community plugin that prepares AI agent briefs from the current note. It does not call any APIs, run AI, or modify notes automatically. It only renders a prompt and copies it to your clipboard.

## Features
- Match path-based templates using ordered regex rules.
- Extract unchecked tasks from the current note.
- Render a brief with file metadata, frontmatter, and selection content.
- Preview and copy the brief from a modal window.

## Commands
- Copy brief for current note
- Open brief preview

## Rule examples (regex)
```regex
^Projects/.*\\.md$
```

```regex
^Clients/Acme/.*$
```

```regex
^Daily/\\d{4}-\\d{2}-\\d{2}\\.md$
```

Rules are evaluated in order; the first match wins. If no rules match, the default template is used.

## Task note example
```markdown
# Release prep

- [ ] Draft release notes
- [ ] Verify changelog
    - [ ] Confirm version numbers
* [ ] Update screenshots
```

Unchecked tasks are extracted and included in the brief with indentation preserved.

## Template variables
- `{{filePath}}` - Full path of the note (absolute on desktop vaults)
- `{{fileName}}` - File name including extension
- `{{dirPath}}` - Folder path (empty for vault root)
- `{{vaultName}}` - Vault name
- `{{content}}` - Full note content
- `{{selection}}` - Current editor selection (or empty)
- `{{tasks}}` - Bullet list of unchecked tasks
- `{{frontmatter}}` - Stringified frontmatter (or empty)
- `{{date}}` - Local date

Unknown variables render as an empty string.

## Recommended workflow
1. Open the note you want to brief.
2. Run "Briefmaker: Copy brief for current note" or open the preview.
3. Paste the brief into Codex (or another AI code agent).
4. Default template contain instruction to update current "Tasks" file after finishing with unchecked tasks

## Install directly from this repo
This repo tracks the built `main.js` file so you can install it without a local build.

### Option A: BRAT (recommended for repo installs)
1. Install the community plugin "BRAT".
2. Open BRAT settings and add this repo URL.
3. Enable Briefmaker in Obsidian's Community plugins list.

### Option B: Manual install from repo files
1. Create a folder at `<Vault>/.obsidian/plugins/briefmaker`.
2. Copy these files into that folder: `manifest.json`, `main.js`, `versions.json`, and `styles.css` .
3. Reload Obsidian and enable Briefmaker.

## Updating locally
If you pull updates from the repo, run `npm run build` to refresh `main.js`

## Development
```bash
npm install
npm run dev
```
