<template>
  <div class="question-node" :class="{ 'is-dragging': isDragging }" @click="onEdit">
    <div class="node-header">
      <Icon icon="mdi:help-circle" :width="20" />
      <span class="node-title">{{ data.label || 'Question' }}</span>
    </div>
    <div class="node-content">
      <div class="question-text" v-if="data.question">
        {{ data.question }}
      </div>
      <div class="question-type" v-if="data.questionType">
        <n-tag :type="getTypeTagType(data.questionType)" size="small">
          {{ getQuestionTypeLabel(data.questionType) }}
        </n-tag>
      </div>
      <div class="options-count" v-if="data.options && data.options.length > 0">
        <n-text depth="3" style="font-size: 12px;">
          {{ data.options.length }} options
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
            circle
            @click.stop
          >
            <template #icon>
              <Icon icon="mdi:delete" :width="16" />
            </template>
          </n-button>
        </template>
        Êtes-vous sûr de vouloir supprimer cette question ?
      </n-popconfirm>
    </div>
    <Handle 
      type="target" 
      :position="Position.Top" 
      :style="{ background: '#2080f0' }"
    />
    <Handle 
      type="source" 
      :position="Position.Bottom" 
      :style="{ background: '#2080f0' }"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { NIcon, NButton, NPopconfirm, NTag, NText } from 'naive-ui'
import { Icon } from '@iconify/vue'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  isDragging: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['delete', 'edit'])

const onDelete = () => {
  emit('delete')
}

const onEdit = () => {
  emit('edit')
}

const getQuestionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    checkbox: 'Choix multiple',
    radio: 'Choix unique',
    text: 'Texte libre',
    number: 'Nombre',
    scale: 'Échelle'
  }
  return labels[type] || type
}

const getTypeTagType = (type: string) => {
  const types: Record<string, string> = {
    checkbox: 'info',
    radio: 'success',
    text: 'warning',
    number: 'error',
    scale: 'default'
  }
  return types[type] || 'default'
}
</script>

<style scoped>
.question-node {
  background: white;
  border: 2px solid #e0e0e6;
  border-radius: 8px;
  min-width: 220px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  position: relative;
  cursor: pointer;
}

.question-node:hover {
  border-color: #2080f0;
  box-shadow: 0 4px 12px rgba(32, 128, 240, 0.15);
  transform: translateY(-1px);
}

.question-node.is-dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e6;
  border-radius: 6px 6px 0 0;
  color: #2080f0;
  font-weight: 500;
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

.question-text {
  font-size: 13px;
  color: #333;
  line-height: 1.4;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.question-type {
  display: flex;
  align-items: center;
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

.question-node:hover .node-actions {
  opacity: 1;
}

:deep(.vue-flow__handle) {
  width: 8px;
  height: 8px;
  border: 2px solid white;
}
</style>