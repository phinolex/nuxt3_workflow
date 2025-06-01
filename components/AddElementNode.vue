<template>
  <div class="add-element-node" :class="{ 'is-dragging': isDragging }">
    <div class="node-header">
      <Icon icon="mdi:plus-circle" :width="20" />
      <span class="node-title">Ajouter un élément</span>
    </div>
    <div class="node-content">
      <div class="element-options">
        <button class="element-option" @click="addNode('question')" title="Ajouter une question">
          <Icon icon="mdi:help-circle" :width="24" />
          <span>Question</span>
        </button>
        <button class="element-option" @click="addNode('audio')" title="Ajouter un audio">
          <Icon icon="mdi:microphone" :width="24" />
          <span>Audio</span>
        </button>
        <button class="element-option" @click="addNode('end')" title="Terminer">
          <Icon icon="mdi:flag-checkered" :width="24" />
          <span>Fin</span>
        </button>
      </div>
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
import { Icon } from '@iconify/vue'
import { useVueFlow } from '@vue-flow/core'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  isDragging: {
    type: Boolean,
    default: false
  },
  id: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['replace', 'node-replaced'])
const { addNodes, removeNodes, addEdges, getEdges, getNode, removeEdges } = useVueFlow()

const addNode = (type: string) => {
  const currentNode = getNode.value(props.id)
  if (!currentNode) return

  // Créer le nouveau node
  const newNodeId = `${type}-${Date.now()}`
  const newNode = {
    id: newNodeId,
    type: type,
    position: {
      x: currentNode.position.x,
      y: currentNode.position.y
    },
    data: getDefaultDataForType(type)
  }

  // Obtenir les edges connectés
  const incomingEdges = getEdges.value.filter(edge => edge.target === props.id)
  const outgoingEdges = getEdges.value.filter(edge => edge.source === props.id)

  // Ajouter le nouveau node
  addNodes(newNode)

  // Supprimer les anciens edges
  removeEdges([...incomingEdges, ...outgoingEdges])

  // Reconnecter les edges sans animation
  incomingEdges.forEach(edge => {
    addEdges({
      ...edge,
      id: edge.id,
      target: newNodeId,
      type: edge.type || 'smoothstep',
      animated: false
    })
  })

  outgoingEdges.forEach(edge => {
    addEdges({
      ...edge,
      id: edge.id,
      source: newNodeId,
      type: edge.type || 'smoothstep',
      animated: false
    })
  })
  
  // Si le nouveau node n'est pas un node "end", créer un edge add-node en dessous
  if (type !== 'end' && outgoingEdges.length === 0) {
    // Créer un node fantôme temporaire pour l'edge add-node
    const ghostTargetId = `${newNodeId}-ghost-target`
    addNodes({
      id: ghostTargetId,
      type: 'action-ghost',
      position: {
        x: currentNode.position.x,
        y: currentNode.position.y + 150
      },
      data: {
        label: 'Cible temporaire',
        isGhost: true
      }
    })
    
    // Créer l'edge add-node
    addEdges({
      id: `e-${newNodeId}-add`,
      source: newNodeId,
      target: ghostTargetId,
      type: 'add-node'
    })
  }

  // Émettre l'événement de remplacement
  emit('node-replaced', {
    oldNodeId: props.id,
    newNodeId: newNodeId,
    newNodeType: type,
    edgeInfo: incomingEdges[0] // Pour identifier la branche de condition
  })

  // Supprimer l'ancien node
  removeNodes([props.id])
}

const getDefaultDataForType = (type: string) => {
  switch (type) {
    case 'question':
      return {
        label: 'Nouvelle question',
        question: '',
        questionType: 'radio',
        options: ['Option 1', 'Option 2']
      }
    case 'audio':
      return {
        label: 'Nouvel audio',
        audioUrl: '',
        autoPlay: true
      }
    case 'end':
      return {
        label: 'Fin du questionnaire',
        message: 'Merci d\'avoir complété ce questionnaire !'
      }
    default:
      return {}
  }
}
</script>

<style scoped>
.add-element-node {
  background: white;
  border: 2px dashed #999;
  border-radius: 8px;
  min-width: 240px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  position: relative;
}

.add-element-node:hover {
  border-color: #666;
  border-style: solid;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.add-element-node.is-dragging {
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
  color: #666;
  font-weight: 500;
}

.node-title {
  font-size: 14px;
}

.node-content {
  padding: 12px;
}

.element-options {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.element-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border: 1px solid #e0e0e6;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
}

.element-option:hover {
  background: #f8f9fa;
  border-color: #2080f0;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(32, 128, 240, 0.15);
}

.element-option:active {
  transform: translateY(0);
}

.element-option span {
  font-size: 11px;
  color: #666;
  font-weight: 500;
}

.element-option:hover span {
  color: #2080f0;
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