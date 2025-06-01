<script setup>
import { Handle, Position } from '@vue-flow/core'

const props = defineProps(['id', 'data', 'selected', 'type', 'sourcePosition', 'targetPosition'])
</script>

<template>
  <div class="node-trigger">
    <Handle type="target" :position="Position.Top" />
    <div class="icon"></div>
    <div class="text">
      <div>
        <span class="number">{{ props.data.step }}.</span> <span class="name">{{ props.data.name }}</span>
      </div>
      <div class="node-name">{{ props.data.node }}</div>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style>
.node-trigger {
  height: 100%;
  width: 100%;
  padding: 0.5rem;
  display: flex;
  flex-direction: row;
  gap: 10px;
  background: white;
  border: 1px solid #cdcdcd;
  border-radius: 4px;
  box-shadow: 0 0 22px #00000044;
  text-transform: none;
  font-size: 0.5em;
  font-weight: normal;
  text-align: left;
  position: relative;
}
.node-trigger .icon {
  height: 20px;
  border: 1px dashed #aaaaaa;
  aspect-ratio: 1 / 1;
}
.node-trigger .name {
  color: #555555;
}

.node-trigger .node-name {
  color: #888888;
}

.node-trigger .vue-flow__handle {
  border: none;
  height: unset;
  width: unset;
  background: transparent;
  font-size: 12px;
}
</style>