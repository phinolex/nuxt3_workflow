<template>
  <div 
    class="condition-node" 
    :class="{ 'is-dragging': isDragging || dragging, 'selected': selected }" 
    @click="onEdit" 
    :key="branchesKey"
  >
    <div class="node-header">
      <Icon icon="mdi:tune" :width="20" />
      <span class="node-title">{{ data.label || 'Condition' }}</span>
    </div>
    <div class="node-content">
      <div class="condition-info" v-if="data.conditionType">
        <n-tag type="warning" size="small">
          {{ getConditionLabel(data.conditionType) }}
        </n-tag>
      </div>
      <div class="condition-desc" v-if="data.description">
        {{ data.description }}
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
            circle
            @click.stop
            class="nodrag"
          >
            <template #icon>
              <Icon icon="mdi:delete" :width="16" />
            </template>
          </n-button>
        </template>
        Êtes-vous sûr de vouloir supprimer cette condition ?
      </n-popconfirm>
    </div>
    <Handle 
      type="target" 
      :position="Position.Top" 
      :style="{ background: '#f0a020' }"
    />
    <Handle 
      type="source" 
      :position="Position.Bottom"
      v-for="(branch, index) in getBranches()"
      :key="`${branchesKey}-${branch.id}`"
      :id="branch.id"
      :style="{ 
        background: '#f0a020',
        left: `${(index + 1) * (100 / (getBranches().length + 1))}%`,
        transform: 'translateX(-50%)'
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { NIcon, NButton, NPopconfirm, NTag } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

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

// Clé calculée pour forcer le re-rendu des handles
const branchesKey = computed(() => {
  const branchList = props.data.branches || []
  return branchList.map(b => b.id).join('-')
})

const onDelete = () => {
  emit('delete')
}

const onEdit = () => {
  emit('edit')
}

const getConditionLabel = (type: string) => {
  const labels: Record<string, string> = {
    single: 'Choix unique',
    multiple: 'Choix multiple',
    custom: 'Personnalisée'
  }
  return labels[type] || type
}

const getBranches = () => {
  return props.data.branches || [
    { id: `${props.id}-true`, label: 'Oui' },
    { id: `${props.id}-false`, label: 'Non' }
  ]
}

</script>

<style scoped>
.condition-node {
  background: white;
  border: 2px solid #e0e0e6;
  border-radius: 8px;
  min-width: 200px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  position: relative;
  cursor: grab;
}

.condition-node:active {
  cursor: grabbing;
}

.condition-node:hover {
  border-color: #f0a020;
  box-shadow: 0 4px 12px rgba(240, 160, 32, 0.15);
  transform: translateY(-1px);
}

.condition-node.is-dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.condition-node.selected {
  border-color: #f0a020;
  box-shadow: 0 0 0 2px rgba(240, 160, 32, 0.3);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fffaf0;
  border-bottom: 1px solid #e0e0e6;
  border-radius: 6px 6px 0 0;
  color: #f0a020;
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

.condition-desc {
  font-size: 12px;
  color: #666;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
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

.condition-node:hover .node-actions {
  opacity: 1;
}

:deep(.vue-flow__handle) {
  width: 8px;
  height: 8px;
  border: 2px solid white;
}

:deep(.vue-flow__handle-bottom) {
  bottom: -4px;
}
</style>