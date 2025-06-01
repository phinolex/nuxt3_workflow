<template>
  <g>
    <!-- Path de l'edge -->
    <BaseEdge 
      :id="id"
      :path="path[0]"
      :marker-end="markerEnd"
      :style="edgeStyle"
    />
    
    <!-- Label de l'edge -->
    <EdgeLabelRenderer v-if="label">
      <div
        :style="{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${path[1]}px,${path[2]}px)`,
          pointerEvents: 'all',
        }"
        class="edge-label"
      >
        <div class="label-content">
          {{ label }}
        </div>
      </div>
    </EdgeLabelRenderer>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@vue-flow/core'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  sourceX: {
    type: Number,
    required: true,
  },
  sourceY: {
    type: Number,
    required: true,
  },
  targetX: {
    type: Number,
    required: true,
  },
  targetY: {
    type: Number,
    required: true,
  },
  sourcePosition: {
    type: String,
    required: true,
  },
  targetPosition: {
    type: String,
    required: true,
  },
  sourceHandle: {
    type: String,
  },
  targetHandle: {
    type: String,
  },
  data: {
    type: Object,
  },
  markerEnd: {
    type: String,
  },
  style: {
    type: Object,
  },
  label: {
    type: String,
  },
  animated: {
    type: Boolean,
    default: false,
  },
})

const path = computed(() => getSmoothStepPath(props))

const edgeStyle = computed(() => ({
  ...props.style,
  strokeDasharray: props.animated ? '5' : undefined,
  animation: props.animated ? 'dashdraw 0.5s linear infinite' : undefined,
}))
</script>

<style scoped>
.edge-label {
  font-size: 12px;
  font-weight: 500;
}

.label-content {
  background: white;
  border: 1px solid #e0e0e6;
  padding: 4px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  color: #666;
  transition: all 0.2s ease;
}

.label-content:hover {
  border-color: #f0a020;
  color: #f0a020;
  box-shadow: 0 2px 8px rgba(240, 160, 32, 0.15);
}

@keyframes dashdraw {
  from {
    stroke-dashoffset: 10;
  }
  to {
    stroke-dashoffset: 0;
  }
}
</style>