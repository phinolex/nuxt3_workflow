<script setup>
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NButton, NPopconfirm } from 'naive-ui'
import { Icon } from '@iconify/vue'

const props = defineProps(['id', 'data', 'selected', 'type', 'sourcePosition', 'targetPosition'])

const { removeNodes, removeEdges, addEdges, getConnectedEdges, edges, nodes, updateNode } = useVueFlow()

function handleDelete() {
  // Get all edges before any modifications
  const allEdges = [...edges.value]
  
  // Find edges connected to this node
  const incomingEdges = allEdges.filter(e => e.target === props.id)
  const outgoingEdges = allEdges.filter(e => e.source === props.id)
  
  // Get the source nodes (predecessors) and target nodes (successors)
  const predecessorIds = incomingEdges.map(e => e.source)
  const successorIds = outgoingEdges.map(e => e.target)
  
  // Vérifier si c'est une branche de condition
  const isBranchNode = props.id.includes('true-') || 
                      props.id.includes('false-') || 
                      props.id.includes('branch-')
  
  let conditionNode = null
  if (isBranchNode && predecessorIds.length > 0) {
    // Trouver le nœud condition parent
    conditionNode = nodes.value.find(n => 
      n.id === predecessorIds[0] && 
      (n.data.name === 'Condition' || n.data.node === 'If/Else')
    )
  }
  
  // Create new edges to reconnect the flow
  const newEdges = []
  
  // Si c'est une branche de condition, ne pas créer d'edge direct entre condition et End
  // car les autres branches restent connectées
  if (!isBranchNode || !conditionNode) {
    // Connect each predecessor to each successor uniquement si ce n'est pas une branche
    predecessorIds.forEach(predId => {
      successorIds.forEach(succId => {
        newEdges.push({
          id: `e${predId}-${succId}`,
          source: predId,
          target: succId,
          type: 'add-node'
        })
      })
    })
  }
  
  // First, manually remove the edges connected to this node
  const edgesToRemove = [...incomingEdges, ...outgoingEdges]
  const edgeIdsToRemove = edgesToRemove.map(e => e.id)
  
  // Remove the connected edges
  removeEdges(edgeIdsToRemove)
  
  // Add the new reconnection edges
  if (newEdges.length > 0) {
    addEdges(newEdges)
  }
  
  // Now remove the node (this won't affect edges since we already removed them)
  removeNodes([props.id])
  
  // Si c'était une branche de condition, repositionner les autres branches
  if (conditionNode) {
    setTimeout(() => {
      repositionConditionBranches(conditionNode.id)
    }, 100)
  }
  
  // Update step numbers for remaining nodes
  const currentStep = parseInt(props.data.step)
  setTimeout(() => {
    nodes.value.forEach(node => {
      if (parseInt(node.data.step) > currentStep) {
        node.data.step = (parseInt(node.data.step) - 1).toString()
      }
    })
  }, 50)
}

function repositionConditionBranches(conditionId) {
  // Trouver toutes les branches restantes de cette condition
  const remainingBranches = []
  edges.value.forEach(edge => {
    if (edge.source === conditionId) {
      const targetNode = nodes.value.find(n => n.id === edge.target)
      if (targetNode && (
        targetNode.id.includes('true-') || 
        targetNode.id.includes('false-') || 
        targetNode.id.includes('branch-')
      )) {
        remainingBranches.push(targetNode)
      }
    }
  })
  
  if (remainingBranches.length === 0) return
  
  // Récupérer la position de la condition
  const conditionNode = nodes.value.find(n => n.id === conditionId)
  if (!conditionNode) return
  
  // Calculer les nouvelles positions centrées
  const horizontalSpacing = 200
  const totalWidth = remainingBranches.length * horizontalSpacing
  const startX = conditionNode.position.x - (totalWidth - horizontalSpacing) / 2
  
  // Repositionner toutes les branches
  remainingBranches.forEach((branch, index) => {
    updateNode(branch.id, {
      position: {
        x: startX + (index * horizontalSpacing),
        y: branch.position.y
      }
    })
  })
  
}
</script>

<template>
  <div class="node-action">
    <Handle type="target" :position="Position.Top" />
    <div class="icon"></div>
    <div class="text">
      <div>
        <span class="number">{{ props.data.step }}.</span> <span class="name">{{ props.data.name }}</span>
      </div>
      <div class="node-name">{{ props.data.node }}</div>
    </div>
    <n-popconfirm
      @positive-click="handleDelete"
      :show-icon="false"
    >
      <template #trigger>
        <n-button
          class="delete-button"
          size="tiny"
          circle
          type="error"
          quaternary
          @click.stop
        >
          <template #icon>
            <Icon icon="mdi:close" :width="12" />
          </template>
        </n-button>
      </template>
      Supprimer ce nœud ?
    </n-popconfirm>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style>
.node-action {
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
.node-action .icon {
  height: 20px;
  border: 1px dashed #aaaaaa;
  aspect-ratio: 1 / 1;
}
.node-action .name {
  color: #555555;
}

.node-action .node-name {
  color: #888888;
}

.node-action .vue-flow__handle {
  border: none;
  height: unset;
  width: unset;
  background: transparent;
  font-size: 12px;
}

.node-action .delete-button {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  padding: 0;
  transition: transform 0.2s;
}

.node-action .delete-button:hover {
  transform: scale(1.1);
}
</style>