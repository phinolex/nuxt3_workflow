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
import { nextTick } from 'vue'

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
const vueFlowInstance = useVueFlow()
const { addNodes, removeNodes, addEdges, removeEdges, findNode } = vueFlowInstance

// Debug: voir ce qui est disponible
console.log('🔍 VueFlow instance methods:', Object.keys(vueFlowInstance))

const addNode = async (type: string) => {
  console.log('🔄 AddElementNode: Début du remplacement', { currentId: props.id, newType: type })
  
  const currentNode = findNode(props.id)
  if (!currentNode) {
    console.error('❌ Node actuel non trouvé:', props.id)
    return
  }

  // Créer le nouveau node
  const newNodeId = `${type}-${Date.now()}`
  
  // Obtenir les edges connectés EN PREMIER pour pouvoir les sauvegarder
  // Utiliser edges depuis l'instance VueFlow
  const edges = vueFlowInstance.edges || vueFlowInstance.getEdges?.() || []
  const allEdges = Array.isArray(edges) ? edges : (edges.value || [])
  const incomingEdges = allEdges.filter(edge => edge.target === props.id)
  const outgoingEdges = allEdges.filter(edge => edge.source === props.id)
  
  // SAUVEGARDER les edges entrant ET sortant AVANT toute autre opération
  const savedIncomingEdge = incomingEdges.length > 0 ? { ...incomingEdges[0] } : null
  const savedOutgoingEdge = outgoingEdges.length > 0 ? { ...outgoingEdges[0] } : null
  console.log('💾 SAUVEGARDE EARLY - Edge entrant dans AddElementNode:', savedIncomingEdge)
  console.log('💾 SAUVEGARDE EARLY - Edge sortant dans AddElementNode:', savedOutgoingEdge)

  // Préparer les informations à stocker AVEC la position originale
  const addElementInfo = {
    nodeId: props.id,
    conditionBranch: props.data.conditionBranch,
    branchLabel: props.data.branchLabel,
    originalPosition: {
      x: currentNode.position.x,
      y: currentNode.position.y
    }
  }
  
  console.log('📍 SAUVEGARDE - Position originale du node AddElement:', {
    nodeId: props.id,
    x: currentNode.position.x,
    y: currentNode.position.y,
    fullPosition: currentNode.position
  })
  console.log('💾 Storing Add Element info:', addElementInfo)
  
  const newNode = {
    id: newNodeId,
    type: type,
    position: {
      x: currentNode.position.x,
      y: currentNode.position.y
    },
    data: {
      ...getDefaultDataForType(type),
      // Stocker les informations du node 'Ajouter un élément' d'origine
      createdFromAddElement: {
        ...addElementInfo,
        savedIncomingEdge: savedIncomingEdge, // Ajouter l'edge entrant sauvé
        savedOutgoingEdge: savedOutgoingEdge  // Ajouter l'edge sortant sauvé
      }
    }
  }
  
  console.log('🔗 Edges connectés:', { 
    incoming: incomingEdges.length, 
    outgoing: outgoingEdges.length 
  })

  // Ajouter le nouveau node
  console.log('➕ Ajout du nouveau node:', newNode)
  addNodes(newNode)

  // Supprimer les anciens edges
  removeEdges([...incomingEdges, ...outgoingEdges])

  // Reconnecter les edges sans animation avec de nouveaux IDs
  incomingEdges.forEach(edge => {
    const newEdgeId = `e-${edge.source}-${edge.sourceHandle || 'default'}-${newNodeId}`
    console.log('🔄 REMPLACEMENT EDGE - Ancien:', edge.id, '→ Nouveau:', newEdgeId)
    addEdges({
      ...edge,
      id: newEdgeId, // CORRECTION: Nouvel ID d'edge
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
  
  // Gérer les edges sortants
  if (type !== 'end') {
    if (outgoingEdges.length > 0) {
      // Reconnecter les edges sortants existants
      outgoingEdges.forEach(edge => {
        addEdges({
          ...edge,
          id: edge.id,
          source: newNodeId,
          type: 'add-node', // Toujours utiliser add-node pour avoir le bouton +
          animated: false
        })
      })
    } else {
      // Créer un nouveau node 'end' comme cible par défaut
      const endId = `${newNodeId}-end`
      addNodes({
        id: endId,
        type: 'end',
        position: {
          x: currentNode.position.x,
          y: currentNode.position.y + 150
        },
        data: {
          label: 'Fin du questionnaire',
          message: 'Merci d\'avoir complété ce questionnaire !'
        }
      })
      
      // Créer l'edge add-node vers le node end
      addEdges({
        id: `e-${newNodeId}-${endId}`,
        source: newNodeId,
        target: endId,
        type: 'add-node'
      })
    }
  } else {
    // Pour un node 'end', reconnecter les edges sortants s'il y en a
    outgoingEdges.forEach(edge => {
      addEdges({
        ...edge,
        id: edge.id,
        source: newNodeId,
        animated: false
      })
    })
  }

  // Supprimer l'ancien node
  removeNodes([props.id])
  
  // Attendre que tout soit bien mis à jour
  await nextTick()
  
  console.log('✅ Node remplacé avec succès:', {
    oldId: props.id,
    newId: newNodeId,
    type: type
  })
  
  // Émettre l'événement de remplacement avec un délai pour s'assurer que tout est prêt
  setTimeout(() => {
    emit('node-replaced', {
      oldNodeId: props.id,
      newNodeId: newNodeId,
      newNodeType: type,
      edgeInfo: incomingEdges[0] // Pour identifier la branche de condition
    })
  }, 100)
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