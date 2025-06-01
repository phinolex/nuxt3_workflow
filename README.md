# 🚀 Visual Workflow Builder

<div align="center">

[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=for-the-badge&logo=vue.js)](https://vuejs.org/)
[![Nuxt.js](https://img.shields.io/badge/Nuxt.js-3.x-00DC82?style=for-the-badge&logo=nuxt.js)](https://nuxt.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vue Flow](https://img.shields.io/badge/Vue%20Flow-Latest-FF6B6B?style=for-the-badge)](https://vueflow.dev/)

A powerful, intuitive visual workflow builder for creating interactive questionnaires, business processes, and guided experiences with conditional logic and multimedia support.

[Live Demo](#) • [Documentation](#documentation) • [Getting Started](#getting-started) • [Features](#features)

</div>

## ✨ Features

### 🎯 Core Capabilities

- **🖱️ Drag & Drop Interface** - Intuitive node-based workflow creation
- **🔄 Automatic Layout** - Smart positioning with Dagre algorithm
- **💾 Import/Export** - Save and load workflows as JSON
- **👻 Ghost Nodes** - Visual feedback during drag operations
- **🔌 Extensible Architecture** - Easy to add custom node types

### 📝 Workflow Components

- **🚀 Trigger Nodes** - Define workflow entry points
- **⚡ Action Nodes** - Execute business logic and tasks
- **❓ Question Nodes** - Interactive forms with multiple input types
- **🔊 Audio Nodes** - Integrate guided audio experiences
- **🔀 Condition Nodes** - Branch workflows based on logic
- **🏁 End Nodes** - Define workflow completion points

### 🎨 Advanced Features

- **📊 Conditional Branching** - Create complex decision trees
- **📱 Responsive Design** - Works on desktop and mobile devices
- **🔍 Real-time Preview** - Test workflows as you build
- **🎯 Smart Edge Management** - Automatic reconnection on node deletion
- **📈 Progress Tracking** - Monitor workflow completion

## 🖼️ Screenshots

### Main Workflow Builder
![Workflow Builder Interface](https://via.placeholder.com/800x600?text=Add+your+workflow+builder+screenshot+here)

### Questionnaire Builder
![Questionnaire Builder](https://via.placeholder.com/800x600?text=Add+your+questionnaire+builder+screenshot+here)

### Condition Configuration
![Condition Node Configuration](https://via.placeholder.com/800x600?text=Add+your+condition+config+screenshot+here)

### Mobile Responsive View
![Mobile View](https://via.placeholder.com/400x800?text=Add+your+mobile+view+screenshot+here)

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/workflow-builder.git
   cd workflow-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Start production server
npm run start
```

## 📚 Documentation

### Creating Your First Workflow

1. **Start with a Trigger Node** - Every workflow begins with a trigger
2. **Add Action Nodes** - Click the "+" button on edges to add nodes
3. **Configure Nodes** - Click any node to open its configuration modal
4. **Connect Nodes** - Drag from output handles to input handles
5. **Test Your Workflow** - Use the preview feature to test

### Node Types

#### 🚀 Trigger Node
The entry point of your workflow. Configure when and how the workflow starts.

#### ⚡ Action Node
General-purpose nodes for executing tasks and operations.

#### ❓ Question Node
Interactive input nodes supporting:
- Text input
- Number input
- Radio buttons
- Checkboxes
- Scale/rating
- Custom validation

#### 🔊 Audio Node
Play audio files with configurable:
- Autoplay settings
- Playback controls
- Duration tracking

#### 🔀 Condition Node
Create branching logic with:
- Multiple branches (not limited to true/false)
- Dynamic handle creation
- Visual branch labels
- Automatic layout adjustment

#### 🏁 End Node
Mark the completion of a workflow path.

### Working with Conditions

```javascript
// Example condition configuration
{
  type: 'condition',
  data: {
    branches: [
      { id: 'branch1', label: 'Age < 18', condition: 'age < 18' },
      { id: 'branch2', label: 'Age >= 18', condition: 'age >= 18' }
    ]
  }
}
```

### Questionnaire Builder

The specialized questionnaire builder provides:
- **Question Types**: Text, number, radio, checkbox, scale
- **Validation**: Required fields, custom rules
- **Conditional Logic**: Show/hide questions based on answers
- **Progress Tracking**: Visual progress indicators
- **Response Collection**: Export responses as JSON/CSV

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` | Delete selected node/edge |
| `Ctrl+S` | Save workflow |
| `Ctrl+O` | Load workflow |
| `Ctrl+Z` | Undo (coming soon) |
| `Escape` | Cancel current operation |

## 🛠️ Development

### Project Structure

```
workflow-builder/
├── components/          # Vue components
│   ├── nodes/          # Node type components
│   └── ...             # UI components
├── pages/              # Nuxt pages
├── composables/        # Vue composables
├── assets/             # Styles and images
├── plugins/            # Vue plugins
└── public/             # Static files
```

### Creating Custom Nodes

1. Create a new component in `components/nodes/`:

```vue
<template>
  <div class="custom-node">
    <Handle type="target" :position="Position.Top" />
    <div class="node-content">
      {{ data.label }}
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps(['data'])
</script>
```

2. Register your node type:

```javascript
const nodeTypes = {
  custom: CustomNode,
  // ... other node types
}
```

### API Reference

#### Workflow Data Structure

```typescript
interface Workflow {
  nodes: Node[]
  edges: Edge[]
  viewport: Viewport
}

interface Node {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, any>
}

interface Edge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Vue.js](https://vuejs.org/) and [Nuxt 3](https://nuxt.com/)
- Flow visualization powered by [Vue Flow](https://vueflow.dev/)
- Graph layout by [Dagre](https://github.com/dagrejs/dagre)
- UI components from [Naive UI](https://www.naiveui.com/) and [Vuetify](https://vuetifyjs.com/)

## 📞 Support

- 📧 Email: support@example.com
- 💬 Discord: [Join our community](https://discord.gg/example)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/workflow-builder/issues)

---

<div align="center">
Made with ❤️ by [Your Name]
</div>