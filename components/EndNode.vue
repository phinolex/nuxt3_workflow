<script setup>
import { Handle, Position } from '@vue-flow/core'

const props = defineProps(['id', 'data', 'selected', 'type', 'sourcePosition', 'targetPosition'])
</script>

<template>
  <div class="end-node">
    <Handle type="source" :position="Position.Top" />
    <div class="content">
      <div class="icon">
        <naive-icon name="material-symbols:flag-2-rounded" color="transparent" iconColor="#0d0d0d"/>
      </div>
      <div class="text">
        <div class="label">Fin</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.end-node {
  height: 100%;
  width: 100%;
  padding: 16px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.end-node:hover {
  border-color: #d0d0d0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  justify-content: center;
}

.icon {
  font-size: 20px;
  color: #6b7280;
  opacity: 0.8;
  display: flex;
}

.text {
  flex: 1;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: #4b5563;
}

.end-node .vue-flow__handle {
  border: none;
  height: unset;
  width: unset;
  background: transparent;
  font-size: 12px;
}
</style>