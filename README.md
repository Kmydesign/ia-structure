# IA Structure

Local-first desktop app that turns Markdown docs into interactive workflow diagrams. Built with Tauri, React, React Flow & ELK.js, it parses any team's Markdown into flowcharts showing steps, decisions, errors & page relationships. Dark mode, offline-first, live file watching, tab-based preview.

## Support

[![Buy me a coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=☕&slug=Kmydesign&button_colour=5F7FFF&font_colour=ffffff&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00)](https://www.buymeacoffee.com/Kmydesign)

## Features

- Import any folder of Markdown files
- Auto-detects flow documents by content structure (not filename)
- Decomposes flows into entry → steps → decisions → errors → exit chains
- Interactive canvas with drag, zoom, pan, and minimap
- Focus mode to isolate individual flows
- Tab-based file viewer for reading source Markdown
- Filter by node type, flow type, or tags
- Top-to-bottom and left-to-right layout directions
- Live file watching — graph updates on save
- Offline-first, no cloud dependency

## Tech Stack

- **Tauri v1** — Rust backend for file system access
- **React + TypeScript** — UI layer
- **React Flow** — Canvas rendering
- **ELK.js** — Auto layout engine
- **Zustand** — State management
- **TailwindCSS** — Styling
- **Unified.js / Remark** — Markdown parsing

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) for your OS

### Install

```bash
npm install
```

### Development

```bash
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## Markdown Format

IA Structure detects flow documents by content structure. See [TEMPLATE.md](TEMPLATE.md) for the universal spec format. Key patterns:

- `### Step N:` headings define flow steps
- `**Entry point**:`, `**Exit point**:` bold key-value pairs define overview
- `| Decision | Options |` tables define decision points
- `| Error | Message |` tables define error states

Files that don't match any pattern are rendered as single nodes with cross-file link connections.

## Project Structure

```
src/
  components/
    Canvas/         # React Flow canvas, nodes, edges
    Sidebar/        # File tree, flows list, filters, details
    Toolbar/        # Top nav bar
    FileViewer/     # Tab-based markdown preview
    Modals/         # Welcome screen
  engine/
    graphBuilder.ts # Flow decomposition engine
    autoLayout.ts   # ELK.js layout
    relationshipEngine.ts
  parsers/
    flowParser.ts   # Universal flow parser
    markdownParser.ts
    nodeDetector.ts
  stores/           # Zustand stores
  types/            # TypeScript types
  styles/           # Global CSS
src-tauri/          # Rust backend
```

## License

[MIT](LICENSE)


