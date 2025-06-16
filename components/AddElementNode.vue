<template>
  <div class="add-element-node" :class="{ 'is-dragging': isDragging || dragging, 'selected': selected, 'hovered': isHovered }">
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
        <button v-if="!isConditionBranch" class="element-option" @click="addNode('end')" title="Terminer">
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
import { nextTick, computed, inject } from 'vue'

// Définir toutes les props que VueFlow transmet automatiquement
const props = defineProps({
  id: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  sourcePosition: {
    type: String,
    default: Position.Bottom
  },
  targetPosition: {
    type: String,
    default: Position.Top
  },
  dragging: {
    type: Boolean,
    default: false
  },
  isDragging: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  dimensions: {
    type: Object,
    default: () => ({ width: 240, height: 100 })
  },
  draggable: {
    type: Boolean,
    default: true
  },
  connectable: {
    type: Boolean,
    default: true
  },
  selectable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['replace', 'node-replaced'])
const vueFlowInstance = useVueFlow()
const { addNodes, removeNodes, addEdges, removeEdges, findNode, updateNodeInternals } = vueFlowInstance

// Injecter l'état de survol depuis le parent (optionnel)
const hoveredAddElementId = inject('hoveredAddElementId', null)
// Injecter le flag de remplacement pour suspendre la suppression des nodes orphelins
const isReplacingNode = inject('isReplacingNode', null)

// Computed pour savoir si ce node est survolé
const isHovered = computed(() => {
  if (!hoveredAddElementId || !hoveredAddElementId.value) return false
  return hoveredAddElementId.value === props.id
})

// Computed pour savoir si ce node fait partie d'une branche de condition
const isConditionBranch = computed(() => {
  return !!props.data?.conditionBranch
})

// Debug: voir ce qui est disponible
console.log('🔍 VueFlow instance methods:', Object.keys(vueFlowInstance))

const addNode = async (type: string) => {
  console.log('🔄 AddElementNode: Début du remplacement', { currentId: props.id, newType: type })
  console.log('🔍 Props reçues par AddElementNode:', props)
  
  // Activer le flag pour suspendre la suppression des nodes orphelins
  if (isReplacingNode && isReplacingNode.value !== undefined) {
    isReplacingNode.value = true
    console.log('🛡️ Suspension de la suppression des nodes orphelins activée')
  }
  
  const currentNode = findNode(props.id)
  if (!currentNode) {
    console.error('❌ Node actuel non trouvé:', props.id)
    return
  }

  // Créer l'ID du nouveau node
  const newNodeId = `${type}-${Date.now()}`
  
  // Obtenir les edges connectés EN PREMIER pour pouvoir les sauvegarder
  // Utiliser edges depuis l'instance VueFlow
  const edges = vueFlowInstance.edges || vueFlowInstance.getEdges?.() || []
  const allEdges = Array.isArray(edges) ? edges : (edges.value || [])
  const incomingEdges = allEdges.filter(edge => edge.target === props.id)
  const outgoingEdges = allEdges.filter(edge => edge.source === props.id)
  
  // SAUVEGARDER les edges entrant ET sortant AVANT toute autre opération
  const savedIncomingEdge = incomingEdges.length > 0 ? { ...incomingEdges[0] } : null
  const savedOutgoingEdges = outgoingEdges.map(edge => ({ ...edge })) // Sauvegarder TOUS les edges sortants
  console.log('💾 SAUVEGARDE EARLY - Edge entrant dans AddElementNode:', savedIncomingEdge)
  console.log('💾 SAUVEGARDE EARLY - Edges sortants dans AddElementNode:', savedOutgoingEdges)

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
        savedOutgoingEdges: savedOutgoingEdges  // Ajouter TOUS les edges sortants sauvés
      }
    },
    // IMPORTANT: Les nodes condition doivent être non-draggable
    // Les nodes question et audio doivent être draggable
    draggable: type === 'condition' ? false : true, // Seuls les nodes condition sont fixes
    selectable: currentNode.selectable !== false, // Par défaut true
    connectable: currentNode.connectable !== false, // Par défaut true
    focusable: currentNode.focusable !== false, // Par défaut true
    // Copier les dimensions si elles existent
    ...(currentNode.dimensions && { dimensions: currentNode.dimensions })
  }
  
  console.log('🔗 Edges connectés:', { 
    incoming: incomingEdges.length, 
    outgoing: outgoingEdges.length 
  })

  // ORDRE CORRIGÉ : D'abord supprimer les anciens edges
  console.log('🗑️ Suppression des edges existants')
  removeEdges([...incomingEdges, ...outgoingEdges])
  
  // Ensuite supprimer l'ancien node AVANT d'ajouter le nouveau
  console.log('🗑️ Suppression du node AddElement:', props.id)
  removeNodes([props.id])
  
  // Attendre que la suppression soit traitée
  await nextTick()
  
  // MAINTENANT ajouter le nouveau node
  console.log('➕ Ajout du nouveau node:', newNode)
  console.log('📦 Node complet avec toutes les props:', {
    ...newNode,
    draggable: props.draggable,
    selectable: props.selectable,
    connectable: props.connectable
  })
  addNodes(newNode)
  
  // Attendre que le node soit ajouté
  await nextTick()
  
  // IMPORTANT: Mettre à jour les internals du nouveau node IMMDIATEMENT après l'ajout
  updateNodeInternals([newNodeId])
  console.log('🔄 NodeInternals mis à jour pour:', newNodeId)
  
  // Vérifier que le node est bien dans la liste
  const verifiedNode = findNode(newNodeId)
  if (!verifiedNode) {
    console.error('❌ ERREUR: Le nouveau node n\'est pas dans la liste!')
  } else {
    console.log('✅ Node vérifié:', verifiedNode)
  }
  
  // Attendre que les internals soient mis à jour
  await nextTick()

  // MAINTENANT reconnecter les edges
  console.log('🔗 Reconnexion des edges')
  
  // Reconnecter les edges entrants
  incomingEdges.forEach(edge => {
    const newEdgeId = `e-${edge.source}-${edge.sourceHandle || 'default'}-${newNodeId}`
    console.log('🔄 REMPLACEMENT EDGE - Ancien:', edge.id, '→ Nouveau:', newEdgeId)
    addEdges({
      ...edge,
      id: newEdgeId,
      target: newNodeId,
      type: edge.type || 'smoothstep',
      animated: false
    })
  })

  // Gérer les edges sortants
  if (type !== 'end') {
    // Si c'est un node dans une branche de condition
    if (isConditionBranch.value) {
      // IMPORTANT: Utiliser les edges sauvegardés car ils ont été supprimés
      const edgesToReconnect = savedOutgoingEdges.length > 0 ? savedOutgoingEdges : outgoingEdges
      
      console.log('🔍 Analyse des edges sortants:', {
        countOriginal: outgoingEdges.length,
        countSaved: savedOutgoingEdges.length,
        edgesOriginal: outgoingEdges.map(e => ({ id: e.id, source: e.source, target: e.target })),
        edgesSaved: savedOutgoingEdges.map(e => ({ id: e.id, source: e.source, target: e.target }))
      })
      
      if (edgesToReconnect.length > 0) {
        console.log('🔗 Reconnexion aux edges sortants (depuis sauvegarde)')
        edgesToReconnect.forEach(edge => {
          console.log('  → Reconnexion:', newNodeId, '→', edge.target)
          addEdges({
            id: `e-${newNodeId}-${edge.target}`,
            source: newNodeId,
            target: edge.target,
            type: 'add-node',
            animated: false
          })
        })
      } else {
        // Si pas d'edge sortant, chercher le node "Fin" de cette branche
        const branchId = props.data.conditionBranch || props.data.branchId
        const expectedEndNodeId = `${branchId}-ghost-end`
        
        console.log('🔍 Pas d\'edge sortant, recherche du node Fin pour la branche:', {
          branchId,
          expectedEndNodeId,
          conditionBranch: props.data.conditionBranch,
          branchIdData: props.data.branchId
        })
        
        const nodes = vueFlowInstance.nodes?.value || vueFlowInstance.getNodes?.() || []
        console.log('📊 Tous les nodes disponibles:', nodes.map(n => ({ id: n.id, type: n.type })))
        
        const endNode = nodes.find(n => n.id === expectedEndNodeId && n.type === 'end')
        
        if (endNode) {
          console.log('✅ Node Fin trouvé:', endNode.id)
          addEdges({
            id: `e-${newNodeId}-${endNode.id}`,
            source: newNodeId,
            target: endNode.id,
            type: 'add-node',
            animated: false
          })
        } else {
          console.log('❌ Aucun node Fin trouvé et aucun edge sortant pour la branche:', branchId)
          console.log('🔍 Nodes de type "end" disponibles:', nodes.filter(n => n.type === 'end').map(n => n.id))
        }
      }
    } else if (!isConditionBranch.value) {
      // Comportement normal pour les nodes non-condition
      if (outgoingEdges.length > 0) {
        // Reconnecter les edges sortants existants
        outgoingEdges.forEach(edge => {
          addEdges({
            ...edge,
            id: edge.id,
            source: newNodeId,
            type: 'add-node',
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
        
        // Attendre et mettre à jour les internals du node end aussi
        await nextTick()
        updateNodeInternals([endId])
        
        // Créer l'edge add-node vers le node end
        addEdges({
          id: `e-${newNodeId}-${endId}`,
          source: newNodeId,
          target: endId,
          type: 'add-node',
          animated: false
        })
      }
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
      edgeInfo: incomingEdges[0], // Pour identifier la branche de condition
      isConditionBranch: isConditionBranch.value // Indiquer si c'est une branche de condition
    })
  }, 100)
  
  // Forcer une mise à jour supplémentaire après un délai
  setTimeout(() => {
    console.log('🔄 Mise à jour finale des internals pour:', newNodeId)
    
    // Mettre à jour le nouveau node ET tous les nodes connectés
    const nodesToUpdate = [newNodeId]
    
    // Ajouter les nodes sources des edges entrants
    incomingEdges.forEach(edge => {
      if (edge.source) nodesToUpdate.push(edge.source)
    })
    
    // Ajouter les nodes cibles des edges sortants
    const allEdges = vueFlowInstance.edges?.value || vueFlowInstance.getEdges?.()
    const newOutgoingEdges = allEdges.filter(e => e.source === newNodeId)
    newOutgoingEdges.forEach(edge => {
      if (edge.target) nodesToUpdate.push(edge.target)
    })
    
    // Mettre à jour tous les nodes concernés
    const uniqueNodes = [...new Set(nodesToUpdate)]
    console.log('🔄 Mise à jour des internals pour les nodes:', uniqueNodes)
    updateNodeInternals(uniqueNodes)
    
    // Vérifier que le node est toujours là et bien configuré
    const finalCheck = findNode(newNodeId)
    if (finalCheck) {
      console.log('✅ Vérification finale - Node présent:', {
        id: finalCheck.id,
        type: finalCheck.type,
        draggable: finalCheck.draggable,
        selectable: finalCheck.selectable
      })
    }
  }, 500)
}

const getDefaultDataForType = (type: string) => {
  switch (type) {
    case 'question':
      return {
        label: 'Nouvelle question',
        question: '',
        questionType: 'radio',
        options: ['Option 1', 'Option 2'],
        required: true,
        // Ajouter un step pour maintenir l'ordre
        step: `${Date.now()}`
      }
    case 'audio':
      return {
        label: 'Nouvel audio',
        audioUrl: '',
        audioTitle: 'Audio configuré',
        autoPlay: true,
        duration: '0:00',
        // Ajouter un step pour maintenir l'ordre
        step: `${Date.now()}`
      }
    case 'end':
      return {
        label: 'Fin du questionnaire',
        message: 'Merci d\'avoir complété ce questionnaire !',
        step: `${Date.now()}`
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

.add-element-node.selected {
  border-color: #666;
  border-style: solid;
  box-shadow: 0 0 0 2px rgba(102, 102, 102, 0.3);
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