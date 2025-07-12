# Salesforce Code Compare - Frontend

A modern, feature-rich code comparison tool built with React and TypeScript, specifically designed for Salesforce development.

## Features

### 🚀 **Enhanced Diff Viewer**
- **GitHub-style diff visualization** using `@git-diff-view/react`
- **Split and unified view modes**
- **Syntax highlighting** with full context support
- **Light and dark themes**
- **Virtual scrolling** for better performance with large files
- **Line wrapping** support
- **Widget system** for adding custom content to diff lines
- **Extend data** for additional context on specific lines

### 🎨 **Customization Options**
- **Font size** adjustment (10-20px)
- **Theme switching** (Light/Dark)
- **View mode** (Side-by-side/Unified)
- **Syntax highlighting** toggle
- **Line wrapping** toggle
- **Widget system** toggle
- **Extend data** toggle

### 📁 **File Management**
- **Tree view** file browser
- **File status indicators** (Modified, Added, Deleted)
- **Collapsible folders**
- **Responsive design** with mobile support

### 🎯 **Salesforce Support**
- **Apex class** syntax highlighting
- **Trigger** syntax highlighting
- **SOQL** query highlighting
- **Visualforce** page support
- **Lightning Web Components** support

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

## Usage

### Basic Diff Viewing
1. **Select a file** from the sidebar
2. **View differences** in the main panel
3. **Toggle settings** using the gear icon

### Advanced Features

#### Widgets
Enable widgets to add custom content to specific diff lines:
- Click the "+" button on any line
- Widgets can contain comments, annotations, or any custom content
- Perfect for code review workflows

#### Extend Data
Enable extend data to show additional context:
- Yellow highlighted sections show additional information
- Useful for showing related changes or context
- Can be customized for your specific needs

#### Theme Switching
- **Light theme**: Clean, GitHub-like appearance
- **Dark theme**: Easy on the eyes for extended use

## Technology Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **@git-diff-view/react** for diff visualization
- **Lucide React** for icons
- **Radix UI** for accessible components

## Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   └── GitDiffViewer.tsx  # Main diff viewer component
├── lib/
│   └── utils.ts      # Utility functions
└── App.tsx           # Main application component
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
