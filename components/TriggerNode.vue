<script setup>
import { Handle, Position } from '@vue-flow/core'
import { Icon } from '@iconify/vue'

const props = defineProps(['id', 'data', 'selected', 'type', 'sourcePosition', 'targetPosition'])
</script>

<template>
  <div class="node-trigger" :class="{ selected }">
    <div class="trigger-header">
      <div class="trigger-icon">
        <Icon icon="mdi:play-circle" :width="24" />
      </div>
      <span class="trigger-step">Étape {{ props.data.step }}</span>
    </div>
    <div class="trigger-content">
      <h3>{{ props.data.name || 'Démarrer' }}</h3>
      <p>{{ props.data.label || 'Début du questionnaire' }}</p>
    </div>
    <!-- Un seul handle en bas -->
    <Handle 
      type="source" 
      :position="Position.Bottom" 
      :style="{ 
        background: '#667eea',
        width: '12px',
        height: '12px',
        border: '3px solid white',
        bottom: '-6px'
      }"
    />
  </div>
</template>

<style scoped>
.node-trigger {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  min-width: 200px;
  transition: all 0.2s ease;
  position: relative;
}

.node-trigger:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.node-trigger.selected {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.trigger-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.trigger-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.trigger-step {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.trigger-content h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.trigger-content p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
}
</style>