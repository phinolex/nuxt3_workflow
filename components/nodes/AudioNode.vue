<template>
  <div 
    class="audio-node" 
    :class="{ 'is-dragging': isDragging || dragging, 'selected': selected }" 
    @click="onEdit"
  >
    <div class="node-header">
      <Icon icon="mdi:volume-high" :width="20" />
      <span class="node-title">{{ data.label || 'Audio' }}</span>
    </div>
    <div class="node-content">
      <div class="audio-info" v-if="data.audioUrl || data.audioTitle">
        <Icon icon="mdi:music-note" :width="16" />
        <span class="audio-title">{{ data.audioTitle || 'Audio configuré' }}</span>
      </div>
      <div v-else class="no-audio">
        <n-text depth="3" style="font-size: 12px;">
          Aucun audio configuré
        </n-text>
      </div>
      <div class="audio-duration" v-if="data.duration">
        <n-text depth="3" style="font-size: 12px;">
          Durée: {{ data.duration }}
        </n-text>
      </div>
    </div>
    <div class="node-actions">
      <n-popconfirm
        @positive-click="onDelete"
        negative-text="Annuler"
        positive-text="Supprimer"
      >
        <template #trigger>
          <n-button 
            size="tiny" 
            type="error"
            quaternary
            circle
            @click.stop
            class="nodrag"
          >
            <template #icon>
              <Icon icon="mdi:delete" :width="16" />
            </template>
          </n-button>
        </template>
        Êtes-vous sûr de vouloir supprimer ce bloc audio ?
      </n-popconfirm>
    </div>
    <Handle 
      type="target" 
      :position="Position.Top" 
      :style="{ background: '#666' }"
    />
    <Handle 
      type="source" 
      :position="Position.Bottom" 
      :style="{ background: '#666' }"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { NIcon, NButton, NPopconfirm, NText } from 'naive-ui'
import { Icon } from '@iconify/vue'

// Définir toutes les props que VueFlow transmet automatiquement
const props = defineProps({
  id: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  sourcePosition: {
    type: String,
    default: Position.Bottom
  },
  targetPosition: {
    type: String,
    default: Position.Top
  },
  dragging: {
    type: Boolean,
    default: false
  },
  isDragging: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  dimensions: {
    type: Object,
    default: () => ({ width: 200, height: 100 })
  },
  draggable: {
    type: Boolean,
    default: true
  },
  connectable: {
    type: Boolean,
    default: true
  },
  selectable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['delete', 'edit'])

const onDelete = () => {
  emit('delete')
}

const onEdit = () => {
  emit('edit')
}

</script>

<style scoped>
.audio-node {
  background: white;
  border: 2px solid #e0e0e6;
  border-radius: 8px;
  min-width: 200px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  position: relative;
}

.audio-node {
  cursor: grab;
}

.audio-node:active {
  cursor: grabbing;
}

.audio-node:hover {
  border-color: #999;
  box-shadow: 0 4px 12px rgba(24, 160, 88, 0.15);
  transform: translateY(-1px);
}

.audio-node.is-dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.audio-node.selected {
  border-color: #666;
  box-shadow: 0 0 0 2px rgba(102, 102, 102, 0.3);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f0faf4;
  border-bottom: 1px solid #e0e0e6;
  border-radius: 6px 6px 0 0;
  color: #666;
  font-weight: 500;
  position: relative;
}

.node-title {
  font-size: 14px;
}

.node-content {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.audio-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #333;
  font-size: 13px;
}

.audio-title {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-audio {
  font-style: italic;
}

.node-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.audio-node:hover .node-actions {
  opacity: 1;
}

:deep(.vue-flow__handle) {
  width: 8px;
  height: 8px;
  border: 2px solid white;
}

:deep(.vue-flow__handle-top) {
  top: -4px;
}

:deep(.vue-flow__handle-bottom) {
  bottom: -4px;
}
</style>