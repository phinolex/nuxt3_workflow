<script setup>
import { Handle, Position } from '@vue-flow/core'

const props = defineProps(['id', 'data', 'selected', 'type', 'sourcePosition', 'targetPosition'])
</script>

<template>
  <div class="node-action-ghost">
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
.node-action-ghost {
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
  opacity: 0.25;
  z-index: 1;
  /* color: #fff; */
}

.node-action-ghost .icon {
  height: 20px;
  border: 1px dashed #aaaaaa;
  aspect-ratio: 1 / 1;
}

.node-action-ghost .vue-flow__handle {
  border: none;
  height: unset;
  width: unset;
  background: transparent;
  font-size: 12px;
}

.vue-flow__node-action-ghost {
  z-index: 500 !important;
}
</style>