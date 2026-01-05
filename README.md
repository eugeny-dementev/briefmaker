# Briefmaker

Briefmaker is an Obsidian community plugin that prepares AI agent briefs from the current note. It does not call any APIs, run AI, or modify notes automatically. It only renders a prompt and copies it to your clipboard.

## Features
- Match path-based templates using ordered regex rules.
- Extract unchecked tasks from the current note.
- Render a brief with file metadata, frontmatter, and selection content.
- Preview and copy the brief from a modal window.

## Commands
- Briefmaker: Copy brief for current note
- Briefmaker: Open brief preview

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
- `{{filePath}}` - Full path of the note
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
4. Apply the returned changes manually inside Obsidian.

## Development
```bash
npm install
npm run dev
```
