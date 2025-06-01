<script setup>
import { computed } from 'vue'
import {
  BaseEdge,
  SmoothStepEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getBezierPath,
  useVueFlow,
  MarkerType,
} from '@vue-flow/core'
import { NButton, NDropdown } from 'naive-ui'
import { h } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps(['id', 'source', 'target', 'sourceX', 'sourceY', 'targetX', 'targetY', 'sourcePosition', 'targetPosition', 'data', 'markerEnd', 'markerStart'])

const { addNodes, addEdges, removeEdges, getNodes, getEdges, updateNode } = useVueFlow()

const path = computed(() => getSmoothStepPath(props))

// Calculer la position du bouton pour les conditions
const buttonPosition = computed(() => {
  const sourceNode = getNodes.value.find(n => n.id === props.source)
  const targetNode = getNodes.value.find(n => n.id === props.target)
  
  const isFromCondition = sourceNode?.data.name === 'Condition' || sourceNode?.data.node === 'If/Else'
  const isTargetBranch = targetNode && (
    targetNode.id.includes('true-') || 
    targetNode.id.includes('false-') || 
    targetNode.id.includes('branch-')
  )
  
  // Si c'est l'edge de la branche True d'une condition
  if (isFromCondition && isTargetBranch && targetNode.id.includes('true-')) {
    // Trouver toutes les branches de cette condition
    const edges = getEdges.value
    const nodes = getNodes.value
    const conditionBranches = edges
      .filter(e => e.source === sourceNode.id)
      .map(e => nodes.find(n => n.id === e.target))
      .filter(n => n && (n.id.includes('true-') || n.id.includes('false-') || n.id.includes('branch-')))
    
    if (conditionBranches.length > 0) {
      // Calculer le centre horizontal de toutes les branches
      // On prend juste la position X des branches sans ajouter d'offset
      const branchXPositions = conditionBranches.map(b => b.position.x)
      const minX = Math.min(...branchXPositions)
      const maxX = Math.max(...branchXPositions)
      
      // Si toutes les branches ont la même largeur (180px par défaut)
      const nodeWidth = 104
      const centerX = minX + ((maxX - minX + nodeWidth) / 2)
      
      // Garder la position Y sur l'edge
      return { x: centerX, y: path.value[2] }
    }
  }
  
  // Pour les autres edges, utiliser la position par défaut
  return { x: path.value[1], y: path.value[2] }
})

// Déterminer si on doit afficher le bouton
const shouldShowButton = computed(() => {
  const sourceNode = getNodes.value.find(n => n.id === props.source)
  const targetNode = getNodes.value.find(n => n.id === props.target)
  const edges = getEdges.value
  
  const isFromCondition = sourceNode?.data.name === 'Condition' || sourceNode?.data.node === 'If/Else'
  const isTargetBranch = targetNode && (
    targetNode.id.includes('true-') || 
    targetNode.id.includes('false-') || 
    targetNode.id.includes('branch-')
  )
  
  // Si c'est un edge entre une condition et ses branches
  if (isFromCondition && isTargetBranch) {
    // Ne montrer le bouton que sur le premier edge (True branch)
    return targetNode.id.includes('true-')
  }
  
  // Pour tous les autres edges, montrer le bouton
  return true
})

const dropdownOptions = computed(() => {
  const sourceNode = getNodes.value.find(n => n.id === props.source)
  const targetNode = getNodes.value.find(n => n.id === props.target)
  
  const isFromCondition = sourceNode?.data.name === 'Condition' || sourceNode?.data.node === 'If/Else'
  const isTargetBranch = targetNode && (
    targetNode.id.includes('true-') || 
    targetNode.id.includes('false-') || 
    targetNode.id.includes('branch-')
  )
  
  // Si on est sur un edge entre une condition et ses branches directes
  if (isFromCondition && isTargetBranch) {
    return [
      {
        label: 'Ajouter une branche',
        key: 'node',  // Utiliser 'node' car handleSelect le transformera en branche
        icon: () => h(Icon, { icon: 'mdi:source-branch-plus' })
      },
      {
        label: 'Ajouter une condition',
        key: 'condition',
        icon: () => h(Icon, { icon: 'mdi:source-branch' })
      }
    ]
  }
  
  // Si on est après une condition mais pas sur une branche directe (ex: entre condition et End)
  if (isFromCondition && !isTargetBranch) {
    return [
      {
        label: 'Ajouter une branche',
        key: 'branch',
        icon: () => h(Icon, { icon: 'mdi:source-branch-plus' })
      },
      {
        label: 'Ajouter une condition',
        key: 'condition',
        icon: () => h(Icon, { icon: 'mdi:source-branch' })
      }
    ]
  }
  
  return [
    {
      label: 'Ajouter un nœud',
      key: 'node',
      icon: () => h(Icon, { icon: 'mdi:plus-box' })
    },
    {
      label: 'Ajouter une condition',
      key: 'condition',
      icon: () => h(Icon, { icon: 'mdi:source-branch' })
    }
  ]
})

function handleSelect(key) {
  const sourceNode = getNodes.value.find(n => n.id === props.source)
  const targetNode = getNodes.value.find(n => n.id === props.target)
  
  // Vérifier si on est sur un edge qui part d'une condition
  const isFromCondition = sourceNode?.data.name === 'Condition' || sourceNode?.data.node === 'If/Else'
  
  // Vérifier si la cible est une branche directe de la condition
  const isTargetBranch = targetNode && (
    targetNode.id.includes('true-') || 
    targetNode.id.includes('false-') || 
    targetNode.id.includes('branch-')
  )
  
  if (key === 'node') {
    // Si on est entre une condition et ses branches directes, ajouter une branche parallèle
    if (isFromCondition && isTargetBranch) {
      handleAddParallelBranch()
    } else {
      handleAddNode()
    }
  } else if (key === 'condition') {
    handleAddCondition()
  } else if (key === 'branch') {
    handleAddParallelBranch()
  }
}

function handleAddNode() {
  const nodes = getNodes.value
  const edges = getEdges.value
  
  // Trouver le nœud source et cible
  const sourceNode = nodes.find(n => n.id === props.source)
  const targetNode = nodes.find(n => n.id === props.target)
  
  if (!sourceNode || !targetNode) return
  
  // Vérifier si on est sur une branche (true/false/branch)
  const isBranchNode = sourceNode.id.includes('true-') || 
                      sourceNode.id.includes('false-') || 
                      sourceNode.id.includes('branch-')
  
  // Position du nouveau nœud
  let newPosition
  if (isBranchNode) {
    // Sur une branche, garder le même X et descendre en Y
    newPosition = {
      x: sourceNode.position.x,
      y: (sourceNode.position.y + targetNode.position.y) / 2
    }
  } else {
    // Comportement normal : au milieu
    newPosition = {
      x: (sourceNode.position.x + targetNode.position.x) / 2,
      y: (sourceNode.position.y + targetNode.position.y) / 2
    }
  }
  
  // Générer un nouvel ID
  const newNodeId = `${Date.now()}`
  
  // Déterminer le numéro d'étape
  const sourceStep = parseInt(sourceNode.data.step)
  const newStep = sourceStep + 1
  
  // Créer le nouveau nœud
  const newNode = {
    id: newNodeId,
    type: 'action',
    position: newPosition,
    data: {
      step: newStep.toString(),
      name: 'New Action',
      node: 'New Node'
    }
  }
  
  // Ajouter le nouveau nœud
  addNodes([newNode])
  
  // Supprimer l'ancien edge
  removeEdges([props.id])
  
  // Créer deux nouveaux edges
  const newEdge1 = {
    id: `e${props.source}-${newNodeId}`,
    source: props.source,
    target: newNodeId,
    type: 'add-node'
  }
  
  const newEdge2 = {
    id: `e${newNodeId}-${props.target}`,
    source: newNodeId,
    target: props.target,
    type: 'add-node'
  }
  
  addEdges([newEdge1, newEdge2])
  
  // Mettre à jour les numéros d'étape de tous les nœuds suivants
  nodes.forEach(node => {
    if (parseInt(node.data.step) >= newStep && node.id !== newNodeId) {
      node.data.step = (parseInt(node.data.step) + 1).toString()
    }
  })
}

function handleAddParallelBranch() {
  const nodes = getNodes.value
  const edges = getEdges.value
  
  let conditionNode = nodes.find(n => n.id === props.source)
  let endNode = nodes.find(n => n.id === props.target)
  
  // Si on est sur un edge entre condition et branche, remonter à la condition
  if (endNode && (endNode.id.includes('true-') || endNode.id.includes('false-') || endNode.id.includes('branch-'))) {
    // Le source est bien la condition, mais il faut trouver le vrai nœud End
    // Chercher le nœud End en suivant les edges depuis la branche
    const edgeFromBranch = edges.find(e => e.source === endNode.id)
    if (edgeFromBranch) {
      endNode = nodes.find(n => n.id === edgeFromBranch.target)
    }
  }
  
  if (!conditionNode || !endNode) return
  
  // Trouver toutes les branches directes de cette condition
  const branchEdges = edges.filter(e => {
    const targetNode = nodes.find(n => n.id === e.target)
    return e.source === conditionNode.id && 
           targetNode && 
           (targetNode.id.includes('true-') || 
            targetNode.id.includes('false-') || 
            targetNode.id.includes('branch-'))
  })
  
  // Trouver tous les nœuds branches
  const branchNodes = branchEdges.map(edge => 
    nodes.find(n => n.id === edge.target)
  ).filter(n => n !== undefined)
  
  const branchCount = branchNodes.length
  
  // Calculer l'espacement horizontal
  const horizontalSpacing = 200
  const totalWidth = (branchCount + 1) * horizontalSpacing
  const centerX = conditionNode.position.x
  const startX = centerX - totalWidth / 2
  
  // Générer un nouvel ID pour la branche
  const branchNodeId = `branch-${Date.now()}`
  const branchStep = parseInt(conditionNode.data.step) + 1
  
  // Repositionner toutes les branches existantes pour faire de la place
  branchNodes.forEach((branchNode, index) => {
    if (branchNode) {
      updateNode(branchNode.id, {
        position: {
          x: startX + (index * horizontalSpacing),
          y: branchNode.position.y
        }
      })
    }
  })
  
  // Compter le nombre total de branches (incluant True, False, et les Branch X)
  // True et False comptent comme Branch 1 et 2, donc on commence à 3
  const totalBranchNumber = branchCount + 1
  
  // Créer la nouvelle branche à la fin
  const newBranchNode = {
    id: branchNodeId,
    type: 'action',
    position: {
      x: startX + (branchCount * horizontalSpacing),
      y: conditionNode.position.y + 100
    },
    data: {
      step: branchStep.toString(),
      name: `Branch ${totalBranchNumber}`,
      node: 'Action'
    }
  }
  
  // Ajouter le nouveau nœud
  addNodes([newBranchNode])
  
  // Créer les edges pour la nouvelle branche
  const newEdges = [
    {
      id: `e${conditionNode.id}-${branchNodeId}`,
      source: conditionNode.id,
      target: branchNodeId,
      type: 'add-node',
      label: `Branch ${totalBranchNumber}`
    },
    {
      id: `e${branchNodeId}-${endNode.id}`,
      source: branchNodeId,
      target: endNode.id,
      type: 'add-node'
    }
  ]
  
  addEdges(newEdges)
  
  // Ne pas mettre à jour les numéros d'étape des autres branches
  // car elles sont parallèles et ont le même numéro d'étape
}

function handleAddCondition() {
  const nodes = getNodes.value
  const edges = getEdges.value
  
  // Trouver le nœud source et cible
  const sourceNode = nodes.find(n => n.id === props.source)
  const targetNode = nodes.find(n => n.id === props.target)
  
  if (!sourceNode || !targetNode) return
  
  // Vérifier si on est directement après une condition existante
  const isAfterCondition = sourceNode.data.name === 'Condition' || sourceNode.data.node === 'If/Else'
  
  if (isAfterCondition) {
    // Si on est après une condition, ajouter une nouvelle branche parallèle
    handleAddParallelBranch()
    return
  }
  
  // Sinon, créer une nouvelle condition avec True/False
  const baseX = (sourceNode.position.x + targetNode.position.x) / 2
  const baseY = (sourceNode.position.y + targetNode.position.y) / 2
  
  // Générer les IDs
  const conditionNodeId = `condition-${Date.now()}`
  const trueNodeId = `true-${Date.now()}`
  const falseNodeId = `false-${Date.now()}`
  
  // Déterminer le numéro d'étape
  const sourceStep = parseInt(sourceNode.data.step)
  const newStep = sourceStep + 1
  
  // Créer le nœud de condition
  const conditionNode = {
    id: conditionNodeId,
    type: 'action',
    position: { x: baseX, y: baseY },
    data: {
      step: newStep.toString(),
      name: 'Condition',
      node: 'If/Else'
    }
  }
  
  // Créer les nœuds de branches sur la même ligne horizontale
  const horizontalSpacing = 200
  const branchY = baseY + 100
  
  // Générer un ID pour la troisième branche
  const thirdBranchId = `branch-${Date.now()}`
  
  // Positionner les 3 branches
  const trueNode = {
    id: trueNodeId,
    type: 'action',
    position: { x: baseX - horizontalSpacing, y: branchY },
    data: {
      step: (newStep + 1).toString(),
      name: 'True Branch',
      node: 'Action'
    }
  }
  
  const falseNode = {
    id: falseNodeId,
    type: 'action',
    position: { x: baseX, y: branchY },
    data: {
      step: (newStep + 1).toString(),
      name: 'False Branch',
      node: 'Action'
    }
  }
  
  const thirdBranchNode = {
    id: thirdBranchId,
    type: 'action',
    position: { x: baseX + horizontalSpacing, y: branchY },
    data: {
      step: (newStep + 1).toString(),
      name: 'Branch 3',
      node: 'Action'
    }
  }
  
  // Ajouter les nœuds
  addNodes([conditionNode, trueNode, falseNode, thirdBranchNode])
  
  // Supprimer l'ancien edge
  removeEdges([props.id])
  
  // Créer les nouveaux edges
  const newEdges = [
    {
      id: `e${props.source}-${conditionNodeId}`,
      source: props.source,
      target: conditionNodeId,
      type: 'add-node'
    },
    {
      id: `e${conditionNodeId}-${trueNodeId}`,
      source: conditionNodeId,
      target: trueNodeId,
      type: 'add-node',
      label: 'True'
    },
    {
      id: `e${conditionNodeId}-${falseNodeId}`,
      source: conditionNodeId,
      target: falseNodeId,
      type: 'add-node',
      label: 'False'
    },
    {
      id: `e${conditionNodeId}-${thirdBranchId}`,
      source: conditionNodeId,
      target: thirdBranchId,
      type: 'add-node',
      label: 'Branch 3'
    },
    {
      id: `e${trueNodeId}-${props.target}`,
      source: trueNodeId,
      target: props.target,
      type: 'add-node'
    },
    {
      id: `e${falseNodeId}-${props.target}`,
      source: falseNodeId,
      target: props.target,
      type: 'add-node'
    },
    {
      id: `e${thirdBranchId}-${props.target}`,
      source: thirdBranchId,
      target: props.target,
      type: 'add-node'
    }
  ]
  
  addEdges(newEdges)
  
  // Mettre à jour les numéros d'étape de tous les nœuds suivants
  nodes.forEach(node => {
    if (parseInt(node.data.step) >= newStep && 
        node.id !== conditionNodeId && 
        node.id !== trueNodeId && 
        node.id !== falseNodeId &&
        node.id !== thirdBranchId) {
      node.data.step = (parseInt(node.data.step) + 2).toString()
    }
  })
}
</script>

<script>
export default {
  inheritAttrs: false,
}
</script>

<template>
  <BaseEdge v-bind="props" :path="path[0]" />

  <EdgeLabelRenderer v-if="shouldShowButton">
    <div
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${buttonPosition.x}px,${buttonPosition.y}px)`,
				display: 'flex'
      }"
      class="nodrag nopan"
    >
      <n-dropdown 
        :options="dropdownOptions" 
        @select="handleSelect"
        placement="bottom"
        :show-arrow="true"
      >
        <n-button 
          size="tiny" 
          circle 
          type="primary"
          class="add-button"
        >
          <template #icon>
            <Icon icon="mdi:plus" :width="12" />
          </template>
        </n-button>
      </n-dropdown>
    </div>
  </EdgeLabelRenderer>
</template>

<style>
.add-button {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.add-button:hover {
  transform: scale(1.1);
}

/* Assurer que le dropdown est visible */
.n-dropdown {
  z-index: 9999 !important;
}

.n-popover {
  z-index: 9999 !important;
}
</style>