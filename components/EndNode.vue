<script setup>
import { Handle, Position } from '@vue-flow/core'

const props = defineProps(['id', 'data', 'selected', 'type', 'sourcePosition', 'targetPosition'])
</script>

<template>
  <div class="end-node">
    <Handle type="source" :position="Position.Top" />
    <div class="text">
      <div><span class="name">{{ props.data.name || 'End' }}</span></div>
    </div>
  </div>
</template>

<style scoped>
.end-node {
  height: 100%;
  width: 100%;
  padding: 0.2rem;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  align-content: stretch;
  gap: 10px;
  background: white;
  border: 1px solid #cdcdcd;
  border-radius: 4px;
  box-shadow: 0 0 22px #00000044;
  text-transform: none;
  font-size: 0.5em;
  font-weight: normal;
  /* text-align: center; */
  position: relative;
}
.end-node .text {
  flex: 1;
}
.end-node .name {
  color: #555555;
}

.end-node .node-name {
  color: #888888;
}

.end-node .vue-flow__handle {
  border: none;
  height: unset;
  width: unset;
  background: transparent;
  font-size: 12px;
}
</style>