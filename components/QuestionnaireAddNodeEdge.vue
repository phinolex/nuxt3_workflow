<script setup>
import { computed, nextTick, watch } from 'vue'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useVueFlow,
} from '@vue-flow/core'
import { NButton, NDropdown } from 'naive-ui'
import { h } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps(['id', 'source', 'target', 'sourceX', 'sourceY', 'targetX', 'targetY', 'sourcePosition', 'targetPosition', 'data', 'markerEnd', 'markerStart', 'label', 'sourceHandle', 'isDropTarget'])

const emit = defineEmits(['edge-deleted'])

// Debug pour voir si la prop change
watch(() => props.isDropTarget, (newVal) => {
  console.log(`🎯 Edge ${props.id} isDropTarget:`, newVal)
})

const { addNodes, addEdges, removeEdges, getNodes, getEdges, updateNode, updateNodeInternals } = useVueFlow()

const path = computed(() => getSmoothStepPath(props))

// Position du bouton au centre de l'edge
const buttonPosition = computed(() => {
  return { x: path.value[1], y: path.value[2] }
})

// Options du dropdown selon le contexte
const dropdownOptions = computed(() => {
  const sourceNode = getNodes.value.find(n => n.id === props.source)
  const targetNode = getNodes.value.find(n => n.id === props.target)
  
  const baseOptions = [
    {
      label: 'Ajouter une question',
      key: 'question',
      icon: () => h(Icon, { icon: 'mdi:help-box' })
    },
    {
      label: 'Ajouter un audio',
      key: 'audio',
      icon: () => h(Icon, { icon: 'mdi:volume-high' })
    },
    {
      label: 'Ajouter une condition',
      key: 'condition',
      icon: () => h(Icon, { icon: 'mdi:source-branch' })
    }
  ]
  
  // Ajouter l'option de suppression si ce n'est pas un edge vers un ghost/add-element
  // ET si le node cible a plusieurs connexions entrantes
  if (targetNode && !targetNode.id.includes('ghost') && !targetNode.id.includes('add-element')) {
    // Compter le nombre de connexions entrantes vers le node cible
    const incomingEdgesToTarget = getEdges.value.filter(edge => 
      edge.target === props.target
    ).length
    
    // N'afficher l'option que si le node cible a plus d'une connexion entrante
    if (incomingEdgesToTarget > 1) {
      baseOptions.push({
        type: 'divider'
      })
      baseOptions.push({
        label: 'Retirer cette connexion',
        key: 'delete',
        icon: () => h(Icon, { icon: 'mdi:link-variant-off', style: { color: '#ff4444' } })
      })
    }
  }
  
  return baseOptions
})

function handleSelect(key) {
  switch (key) {
    case 'question':
      handleAddQuestion()
      break
    case 'audio':
      handleAddAudio()
      break
    case 'condition':
      handleAddCondition()
      break
    case 'delete':
      handleDeleteConnection()
      break
  }
}

async function handleAddQuestion() {
  const nodes = getNodes.value
  const edges = getEdges.value
  const sourceNode = nodes.find(n => n.id === props.source)
  const targetNode = nodes.find(n => n.id === props.target)
  
  if (!sourceNode || !targetNode) return
  
  const newNodeId = `question-${Date.now()}`
  const sourceStep = parseInt(sourceNode.data.step) || 0
  const newStep = sourceStep + 1
  
  const newNode = {
    id: newNodeId,
    type: 'question',
    position: {
      x: (sourceNode.position.x + targetNode.position.x) / 2,
      y: (sourceNode.position.y + targetNode.position.y) / 2
    },
    data: {
      step: newStep.toString(),
      label: `Question ${newStep}`,
      question: '',
      questionType: 'checkbox',
      options: [],
      required: true
    }
    // Les propriétés draggable, selectable, connectable sont gérées par VueFlow par défaut
  }
  
  addNodes([newNode])
  removeEdges([props.id])
  
  const newEdge1 = {
    id: `e-${props.source}-${newNodeId}`,
    source: props.source,
    sourceHandle: props.sourceHandle,
    target: newNodeId,
    type: 'add-node'
  }
  
  // Vérifier si le node cible est un node "end" temporaire qui doit être supprimé
  const shouldRemoveTargetEnd = targetNode.type === 'end' && 
    edges.filter(e => e.source === props.target).length === 0 && // pas de connexions sortantes
    edges.filter(e => e.target === props.target).length === 1 // seulement notre connexion entrante
  
  if (shouldRemoveTargetEnd) {
    // Supprimer le node end temporaire
    setTimeout(() => {
      removeNodes([props.target])
    }, 50)
    
    // Créer un nouveau node end après le nouveau node
    const endNodeId = `end-${Date.now()}`
    const endNode = {
      id: endNodeId,
      type: 'end',
      position: {
        x: newNode.position.x,
        y: newNode.position.y + 150
      },
      data: {
        step: (newStep + 1).toString(),
        name: 'Fin',
        label: 'Questionnaire terminé'
      }
    }
    
    addNodes([endNode])
    
    const newEdge2 = {
      id: `e-${newNodeId}-${endNodeId}`,
      source: newNodeId,
      target: endNodeId,
      type: 'add-node'
    }
    
    addEdges([newEdge1, newEdge2])
  } else {
    // Comportement normal : connecter au node cible existant
    const newEdge2 = {
      id: `e-${newNodeId}-${props.target}`,
      source: newNodeId,
      target: props.target,
      type: 'add-node'
    }
    
    addEdges([newEdge1, newEdge2])
  }
  
  // Mettre à jour les steps des nœuds suivants
  nodes.forEach(node => {
    if (parseInt(node.data.step) >= newStep && node.id !== newNodeId) {
      node.data.step = (parseInt(node.data.step) + 1).toString()
    }
  })
  
  // IMPORTANT: Mettre à jour les internals du nouveau node pour activer le drag & drop
  await nextTick()
  // Mettre à jour le nouveau node ET les nodes connectés pour corriger l'alignement
  const nodesToUpdate = [newNodeId, props.source, props.target]
  updateNodeInternals(nodesToUpdate)
}

async function handleAddAudio() {
  const nodes = getNodes.value
  const edges = getEdges.value
  const sourceNode = nodes.find(n => n.id === props.source)
  const targetNode = nodes.find(n => n.id === props.target)
  
  if (!sourceNode || !targetNode) return
  
  const newNodeId = `audio-${Date.now()}`
  const sourceStep = parseInt(sourceNode.data.step) || 0
  const newStep = sourceStep + 1
  
  const newNode = {
    id: newNodeId,
    type: 'audio',
    position: {
      x: (sourceNode.position.x + targetNode.position.x) / 2,
      y: (sourceNode.position.y + targetNode.position.y) / 2
    },
    data: {
      step: newStep.toString(),
      label: `Audio ${newStep}`,
      audioTitle: '',
      audioUrl: '',
      duration: '',
      autoPlay: false,
      showControls: true
    }
    // Les propriétés draggable, selectable, connectable sont gérées par VueFlow par défaut
  }
  
  addNodes([newNode])
  removeEdges([props.id])
  
  const newEdge1 = {
    id: `e-${props.source}-${newNodeId}`,
    source: props.source,
    sourceHandle: props.sourceHandle,
    target: newNodeId,
    type: 'add-node'
  }
  
  // Vérifier si le node cible est un node "end" temporaire qui doit être supprimé
  const shouldRemoveTargetEnd = targetNode.type === 'end' && 
    edges.filter(e => e.source === props.target).length === 0 && // pas de connexions sortantes
    edges.filter(e => e.target === props.target).length === 1 // seulement notre connexion entrante
  
  if (shouldRemoveTargetEnd) {
    // Supprimer le node end temporaire
    setTimeout(() => {
      removeNodes([props.target])
    }, 50)
    
    // Créer un nouveau node end après le nouveau node
    const endNodeId = `end-${Date.now()}`
    const endNode = {
      id: endNodeId,
      type: 'end',
      position: {
        x: newNode.position.x,
        y: newNode.position.y + 150
      },
      data: {
        step: (newStep + 1).toString(),
        name: 'Fin',
        label: 'Questionnaire terminé'
      }
    }
    
    addNodes([endNode])
    
    const newEdge2 = {
      id: `e-${newNodeId}-${endNodeId}`,
      source: newNodeId,
      target: endNodeId,
      type: 'add-node'
    }
    
    addEdges([newEdge1, newEdge2])
  } else {
    // Comportement normal : connecter au node cible existant
    const newEdge2 = {
      id: `e-${newNodeId}-${props.target}`,
      source: newNodeId,
      target: props.target,
      type: 'add-node'
    }
    
    addEdges([newEdge1, newEdge2])
  }
  
  // Mettre à jour les steps des nœuds suivants
  nodes.forEach(node => {
    if (parseInt(node.data.step) >= newStep && node.id !== newNodeId) {
      node.data.step = (parseInt(node.data.step) + 1).toString()
    }
  })
  
  // IMPORTANT: Mettre à jour les internals du nouveau node pour activer le drag & drop
  await nextTick()
  // Mettre à jour le nouveau node ET les nodes connectés pour corriger l'alignement
  const nodesToUpdate = [newNodeId, props.source, props.target]
  updateNodeInternals(nodesToUpdate)
}

async function handleAddCondition() {
  const nodes = getNodes.value
  const edges = getEdges.value
  const sourceNode = nodes.find(n => n.id === props.source)
  const targetNode = nodes.find(n => n.id === props.target)
  
  if (!sourceNode || !targetNode) return
  
  const baseX = (sourceNode.position.x + targetNode.position.x) / 2
  const baseY = (sourceNode.position.y + targetNode.position.y) / 2
  
  const conditionNodeId = `condition-${Date.now()}`
  const sourceStep = parseInt(sourceNode.data.step) || 0
  const newStep = sourceStep + 1
  
  const conditionNode = {
    id: conditionNodeId,
    type: 'condition',
    position: { x: baseX, y: baseY },
    draggable: false, // Les nodes condition sont fixes
    data: {
      step: newStep.toString(),
      label: 'Nouvelle condition',
      conditionType: 'single',
      description: '',
      branches: [
        { id: `${conditionNodeId}-branch1`, label: 'Option 1', condition: '' },
        { id: `${conditionNodeId}-branch2`, label: 'Option 2', condition: '' }
      ]
    }
  }
  
  // Créer les nodes add-element pour TOUTES les branches
  const addElementNodes = conditionNode.data.branches.map((branch, index) => {
    const totalBranches = conditionNode.data.branches.length
    const spaceBetweenNodes = 200
    
    // Calculer la position X pour centrer le groupe sous le node condition
    const offset = (index - (totalBranches - 1) / 2) * spaceBetweenNodes
    const nodeX = baseX + offset - 120 // -120 car le node add-element fait 240px de large (moitié = 120)
    
    return {
      id: `${conditionNodeId}-${branch.id}-ghost`,
      type: 'add-element',
      position: {
        x: nodeX,
        y: baseY + 150
      },
      data: {
        label: `Suite: ${branch.label}`,
        isGhost: true,
        conditionBranch: branch.id,
        branchLabel: branch.label
      }
      // Les propriétés draggable, selectable, connectable sont gérées par VueFlow par défaut
    }
  })
  
  // Ajouter le node condition et les nodes add-element
  addNodes([conditionNode, ...addElementNodes])
  removeEdges([props.id])
  
  // Créer l'edge vers la condition
  const edgeToCondition = {
    id: `e-${props.source}-${conditionNodeId}`,
    source: props.source,
    sourceHandle: props.sourceHandle,
    target: conditionNodeId,
    type: 'add-node'
  }
  
  // Créer les edges pour toutes les branches vers les nodes add-element
  const branchEdges = conditionNode.data.branches.map((branch) => ({
    id: `e-${conditionNodeId}-${branch.id}`,
    source: conditionNodeId,
    sourceHandle: branch.id,
    target: `${conditionNodeId}-${branch.id}-ghost`,
    type: 'simple-condition',
    label: branch.label,
    animated: true
  }))
  
  // Créer des nodes "end" en dessous de chaque add-element SAUF le premier
  const endNodesForAddElements = addElementNodes.slice(1).map((addElementNode, index) => ({
    id: `${addElementNode.id}-end`,
    type: 'end',
    position: {
      x: addElementNode.position.x,
      y: addElementNode.position.y + 150
    },
    data: {
      label: 'Fin du questionnaire',
      message: 'Merci d\'avoir complété ce questionnaire !'
    }
  }))
  
  // Créer les edges "add-node" depuis les add-element vers leurs nodes end (sauf le premier)
  const addNodeEdges = addElementNodes.slice(1).map((addElementNode) => ({
    id: `e-${addElementNode.id}-add`,
    source: addElementNode.id,
    target: `${addElementNode.id}-end`,
    type: 'add-node'
  }))
  
  // Vérifier si le node cible est un node "end" temporaire qui doit être supprimé
  const shouldRemoveTargetEnd = targetNode.type === 'end' && 
    edges.filter(e => e.source === props.target).length === 0 && // pas de connexions sortantes
    edges.filter(e => e.target === props.target).length === 1 // seulement notre connexion entrante
  
  if (shouldRemoveTargetEnd) {
    // Supprimer le node end temporaire après un court délai
    setTimeout(() => {
      removeNodes([props.target])
    }, 100)
    
    // Créer l'edge du premier add-element vers un nouveau node end
    const newEndNodeId = `end-${Date.now()}`
    const newEndNode = {
      id: newEndNodeId,
      type: 'end',
      position: {
        x: addElementNodes[0].position.x,
        y: addElementNodes[0].position.y + 150
      },
      data: {
        step: (parseInt(sourceNode.data.step) + 2).toString(),
        name: 'Fin',
        label: 'Questionnaire terminé'
      }
    }
    
    // Ajouter le nouveau node end et tous les autres nodes end
    addNodes([newEndNode, ...endNodesForAddElements])
    
    // Créer l'edge vers le nouveau node end
    const firstAddElementToNewEnd = {
      id: `e-${addElementNodes[0].id}-${newEndNodeId}`,
      source: addElementNodes[0].id,
      target: newEndNodeId,
      type: 'add-node'
    }
    
    // Ajouter tous les edges
    addEdges([edgeToCondition, ...branchEdges, ...addNodeEdges, firstAddElementToNewEnd])
  } else {
    // Comportement normal : connecter au node cible existant
    const firstAddElementToTarget = {
      id: `e-${addElementNodes[0].id}-${props.target}`,
      source: addElementNodes[0].id,
      target: props.target,
      type: 'add-node'
    }
    
    // Ajouter tous les nodes end
    addNodes(endNodesForAddElements)
    
    // Ajouter tous les edges
    addEdges([edgeToCondition, ...branchEdges, ...addNodeEdges, firstAddElementToTarget])
    
    // Déplacer le node cible existant vers le bas pour qu'il soit au niveau des add-element
    if (targetNode) {
      // Placer le node cible en dessous du premier add-element
      updateNode(props.target, {
        position: {
          x: addElementNodes[0].position.x,
          y: addElementNodes[0].position.y + 150
        }
      })
    }
  }
  
  // Mettre à jour les steps des nœuds suivants
  nodes.forEach(node => {
    if (parseInt(node.data.step) >= newStep && node.id !== conditionNodeId) {
      node.data.step = (parseInt(node.data.step) + 1).toString()
    }
  })
  
  // IMPORTANT: Mettre à jour les internals du nouveau node de condition et des nodes add-element
  await nextTick()
  const allNewNodeIds = [conditionNodeId, ...addElementNodes.map(n => n.id)]
  updateNodeInternals(allNewNodeIds)
}

function handleDeleteConnection() {
  console.log('=== handleDeleteConnection START ===')
  console.log('Removing edge:', props.id)
  console.log('Source:', props.source, 'Target:', props.target)
  
  // D'abord, obtenir les références des nodes AVANT de supprimer l'edge
  const targetNode = getNodes.value.find(n => n.id === props.target)
  const sourceNode = getNodes.value.find(n => n.id === props.source)
  
  console.log('Target node:', targetNode)
  console.log('Source node:', sourceNode)
  
  // Obtenir tous les edges AVANT la suppression
  const allEdgesBefore = getEdges.value
  console.log('All edges before deletion:', allEdgesBefore)
  
  // Compter les connexions entrantes AVANT suppression (excluant celle qu'on va supprimer)
  const incomingEdgesBeforeDeletion = allEdgesBefore.filter(edge => 
    edge.target === props.target && edge.id !== props.id
  )
  console.log('Incoming edges to target (excluding current):', incomingEdgesBeforeDeletion)
  
  // Supprimer cet edge
  removeEdges([props.id])
  
  // Attendre un tick pour que la suppression soit effective
  setTimeout(() => {
    console.log('=== After deletion ===')
    const allEdgesAfter = getEdges.value
    console.log('All edges after deletion:', allEdgesAfter)
    
    // Vérifier si le NODE SOURCE n'a plus de connexions sortantes
    if (sourceNode) {
      const outgoingEdgesFromSource = allEdgesAfter.filter(edge => edge.source === props.source)
      console.log('Outgoing edges from SOURCE after deletion:', outgoingEdgesFromSource)
      
      // Si le node source n'a plus de connexions sortantes, ajouter un node Fin
      if (outgoingEdgesFromSource.length === 0) {
        console.log('Source node has NO outgoing edges, creating END node')
        const endNodeId = `${props.source}-end-${Date.now()}`
        const endNode = {
          id: endNodeId,
          type: 'end',
          position: {
            x: sourceNode.position.x,
            y: sourceNode.position.y + 150
          },
          data: {
            label: 'Fin du questionnaire',
            message: 'Merci d\'avoir complété ce questionnaire !'
          }
        }
        
        // Ajouter le node Fin
        addNodes(endNode)
        console.log('Added end node:', endNodeId)
        
        // Créer l'edge avec le bouton "+"
        const newEdge = {
          id: `e-${props.source}-${endNodeId}`,
          source: props.source,
          target: endNodeId,
          type: 'add-node'
        }
        addEdges(newEdge)
        console.log('Added edge to end node:', newEdge)
      }
    }
    
    // Vérifier aussi le node cible au cas où
    if (targetNode && incomingEdgesBeforeDeletion.length === 0) {
      console.log('Target node has NO incoming edges after deletion')
      
      // Vérifier les connexions sortantes
      const outgoingEdges = allEdgesAfter.filter(edge => edge.source === props.target)
      console.log('Outgoing edges from target:', outgoingEdges)
      
      // Ne créer un node Fin que s'il n'y a pas de connexions sortantes
      if (outgoingEdges.length === 0) {
        console.log('Creating END node for isolated target')
        const endNodeId = `${props.target}-end-${Date.now()}`
        const endNode = {
          id: endNodeId,
          type: 'end',
          position: {
            x: targetNode.position.x,
            y: targetNode.position.y + 150
          },
          data: {
            label: 'Fin du questionnaire',
            message: 'Merci d\'avoir complété ce questionnaire !'
          }
        }
        
        // Ajouter le node Fin
        addNodes(endNode)
        console.log('Added end node for target:', endNodeId)
        
        // Créer l'edge avec le bouton "+"
        const newEdge = {
          id: `e-${props.target}-${endNodeId}`,
          source: props.target,
          target: endNodeId,
          type: 'add-node'
        }
        addEdges(newEdge)
        console.log('Added edge to end node for target:', newEdge)
      }
    }
  }, 100) // Petit délai pour s'assurer que la suppression est effective
  
  // Si on supprime une connexion depuis une condition, vérifier s'il faut créer un add-element node
  if (sourceNode?.type === 'condition' && props.sourceHandle) {
    // Vérifier s'il y a d'autres edges depuis ce handle
    const otherEdgesFromHandle = getEdges.value.filter(edge => 
      edge.source === props.source && 
      edge.sourceHandle === props.sourceHandle && 
      edge.id !== props.id
    )
    
    // Si pas d'autres edges depuis ce handle, créer un add-element node
    if (otherEdgesFromHandle.length === 0) {
      const branch = sourceNode.data.branches?.find((b) => b.id === props.sourceHandle)
      if (branch) {
        const addElementId = `${props.source}-${props.sourceHandle}-ghost`
        
        // Calculer la position du add-element node
        const conditionX = sourceNode.position.x
        const conditionY = sourceNode.position.y
        const conditionWidth = 300 // largeur du node condition
        const conditionCenterX = conditionX + conditionWidth / 2
        
        // Position du add-element node
        const addElementNode = {
          id: addElementId,
          type: 'add-element',
          position: {
            x: conditionCenterX - 120, // centré sous le handle
            y: conditionY + 150
          },
          data: {
            label: `Suite: ${branch.label}`,
            isGhost: true,
            conditionBranch: props.sourceHandle,
            branchLabel: branch.label
          }
        }
        
        // Créer le node Fin pour cet add-element
        const endNodeId = `${addElementId}-end`
        const endNode = {
          id: endNodeId,
          type: 'end',
          position: {
            x: conditionCenterX - 120,
            y: conditionY + 300
          },
          data: {
            label: 'Fin du questionnaire',
            message: 'Merci d\'avoir complété ce questionnaire !'
          }
        }
        
        // Ajouter les nodes
        addNodes([addElementNode, endNode])
        
        // Créer les edges
        addEdges([
          {
            id: `e-${props.source}-${props.sourceHandle}-${addElementId}`,
            source: props.source,
            sourceHandle: props.sourceHandle,
            target: addElementId,
            type: 'simple-condition',
            label: branch.label,
            animated: true
          },
          {
            id: `e-${addElementId}-${endNodeId}`,
            source: addElementId,
            target: endNodeId,
            type: 'add-node'
          }
        ])
      }
    }
  }
  
  // Émettre l'événement pour déclencher le layout
  emit('edge-deleted')
}
</script>

<script>
export default {
  inheritAttrs: false,
}
</script>

<template>
  <BaseEdge v-bind="props" :path="path[0]" />
  
  <!-- Label de l'edge si présent -->
  <EdgeLabelRenderer v-if="props.label">
    <div
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${path[1]}px,${path[2] - 20}px)`,
        fontSize: '12px',
        fontWeight: 500,
        background: 'white',
        padding: '2px 8px',
        borderRadius: '4px',
        border: '1px solid #e0e0e6',
        color: '#666'
      }"
      class="nodrag nopan"
    >
      {{ props.label }}
    </div>
  </EdgeLabelRenderer>

  <EdgeLabelRenderer>
    <div
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${buttonPosition.x}px,${buttonPosition.y}px)`,
        display: 'flex'
      }"
      class="nodrag nopan"
    >
      <!-- Drop indicator moderne -->
      <div v-if="props.isDropTarget" class="drop-indicator-modern">
        <!-- Cercle principal avec animation douce -->
        <div class="drop-circle-main"></div>
        <!-- Pulsation douce -->
        <div class="drop-pulse"></div>
        <div class="drop-pulse drop-pulse-delayed"></div>
      </div>
      
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
          :class="['add-button', { 'drop-target': props.isDropTarget }]"
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

.add-button.drop-target {
  transform: scale(1.15);
  background-color: #2080f0 !important;
  border-color: #2080f0 !important;
  box-shadow: 0 0 0 3px rgba(32, 128, 240, 0.2);
  z-index: 20;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Drop indicator moderne */
.drop-indicator-modern {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 15;
}

/* Cercle principal avec animation douce */
.drop-circle-main {
  position: absolute;
  width: 45px;
  height: 45px;
  border: 2px solid #2080f0;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.6;
  box-shadow: 0 0 10px rgba(32, 128, 240, 0.3);
  animation: smooth-rotate 4s linear infinite, smooth-scale 2s ease-in-out infinite;
}

/* Animations douces pour le cercle principal */
@keyframes smooth-rotate {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes smooth-scale {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
  }
}

/* Pulsations douces */
.drop-pulse {
  position: absolute;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(32, 128, 240, 0.3) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(1);
  animation: gentle-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.drop-pulse-delayed {
  animation-delay: 1s;
}

/* Animation de pulsation douce */
@keyframes gentle-pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.5;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.5);
    opacity: 0;
  }
}

.n-dropdown {
  z-index: 9999 !important;
}

.n-popover {
  z-index: 9999 !important;
}
</style>