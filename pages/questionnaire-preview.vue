<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { 
  NCard, 
  NButton, 
  NCheckbox, 
  NRadio, 
  NInput, 
  NInputNumber,
  NSlider,
  NSpace, 
  NProgress,
  NResult,
  NIcon,
  useMessage,
  NCheckboxGroup,
  NRadioGroup,
  NText
} from 'naive-ui'
import { Icon } from '@iconify/vue'
import WorkflowSelector from '../components/WorkflowSelector.vue'

const message = useMessage()

interface WorkflowNode {
  id: string
  type: string
  data: any
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  label?: string
  data?: {
    conditionValue?: string
    conditionType?: string
    [key: string]: any
  }
}

// État du questionnaire
const workflow = ref<{ nodes: WorkflowNode[], edges: WorkflowEdge[] } | null>(null)
const currentNodeId = ref<string>('start')
const responses = ref<Record<string, any>>({})
const questionHistory = ref<string[]>(['start'])
const isCompleted = ref(false)
const showWorkflowSelector = ref(false)
const isInitializing = ref(true)

// Charger le workflow depuis localStorage
onMounted(() => {
  console.log('🚀 === DÉMARRAGE QUESTIONNAIRE-PREVIEW ===')
  
  // Vérifier si on a un ID dans l'URL
  const urlParams = new URLSearchParams(window.location.search)
  const workflowId = urlParams.get('id')
  console.log('📍 ID dans URL:', workflowId)
  
  if (workflowId) {
    // Charger le workflow spécifique
    console.log(`📂 Tentative de chargement du workflow: ${workflowId}`)
    const savedWorkflow = localStorage.getItem(workflowId)
    if (savedWorkflow) {
      try {
        const parsedWorkflow = JSON.parse(savedWorkflow)
        workflow.value = parsedWorkflow
        
        console.log('✅ Workflow chargé avec succès:', {
          id: workflowId,
          name: parsedWorkflow.metadata?.name,
          nodesCount: parsedWorkflow.nodes?.length,
          edgesCount: parsedWorkflow.edges?.length,
          nodes: parsedWorkflow.nodes?.map(n => ({
            id: n.id,
            type: n.type,
            label: n.data?.label
          })),
          edges: parsedWorkflow.edges?.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            label: e.label,
            hasData: !!e.data,
            data: e.data
          }))
        })
        
        // Afficher les conditions en détail
        const conditionNodes = parsedWorkflow.nodes?.filter(n => n.type === 'condition') || []
        console.log('🎯 NODES CONDITION:', conditionNodes.length)
        conditionNodes.forEach(node => {
          console.log(`\n📋 Condition "${node.data.label}" (${node.id}):`)
          console.log('  - Branches:', node.data.branches)
          console.log('  - Type:', node.data.conditionType)
          
          const outgoingEdges = parsedWorkflow.edges.filter(e => e.source === node.id)
          console.log('  - Edges sortants:', outgoingEdges.map(e => ({
            target: e.target,
            sourceHandle: e.sourceHandle,
            label: e.label,
            data: e.data
          })))
        })
        
      } catch (error) {
        console.error('❌ Erreur parsing workflow:', error)
        message.error('Erreur lors du chargement du questionnaire')
      }
    } else {
      console.warn(`⚠️ Aucun workflow trouvé avec l'ID: ${workflowId}`)
    }
  } else {
    // Charger le questionnaire actuel
    console.log('📂 Chargement du questionnaire actuel (currentQuestionnaire)')
    const savedWorkflow = localStorage.getItem('currentQuestionnaire')
    if (savedWorkflow) {
      try {
        const parsedWorkflow = JSON.parse(savedWorkflow)
        workflow.value = parsedWorkflow
        
        console.log('✅ Questionnaire actuel chargé:', {
          name: parsedWorkflow.metadata?.name,
          id: parsedWorkflow.metadata?.id,
          nodesCount: parsedWorkflow.nodes?.length,
          edgesCount: parsedWorkflow.edges?.length,
          nodes: parsedWorkflow.nodes?.map(n => ({
            id: n.id,
            type: n.type,
            label: n.data?.label
          })),
          edges: parsedWorkflow.edges?.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            label: e.label,
            hasData: !!e.data,
            data: e.data
          }))
        })
        
        // Afficher les conditions en détail
        const conditionNodes = parsedWorkflow.nodes?.filter(n => n.type === 'condition') || []
        console.log('🎯 NODES CONDITION:', conditionNodes.length)
        conditionNodes.forEach(node => {
          console.log(`\n📋 Condition "${node.data.label}" (${node.id}):`)
          console.log('  - Branches:', node.data.branches)
          console.log('  - Type:', node.data.conditionType)
          
          const outgoingEdges = parsedWorkflow.edges.filter(e => e.source === node.id)
          console.log('  - Edges sortants:', outgoingEdges.map(e => ({
            target: e.target,
            sourceHandle: e.sourceHandle,
            label: e.label,
            data: e.data
          })))
        })
        
      } catch (error) {
        console.error('❌ Erreur parsing questionnaire actuel:', error)
        message.error('Erreur lors du chargement du questionnaire')
      }
    } else {
      console.warn('⚠️ Aucun questionnaire actuel trouvé')
    }
  }
  
  // Si aucun questionnaire n'est trouvé, ouvrir automatiquement le sélecteur
  if (!workflow.value) {
    console.log('🔄 Aucun workflow chargé, ouverture du sélecteur...')
    setTimeout(() => {
      showWorkflowSelector.value = true
      isInitializing.value = false
    }, 500)
  } else {
    console.log('✅ Workflow prêt pour la preview')
    isInitializing.value = false
  }
  
  console.log('🏁 === FIN CHARGEMENT ===\n')
})

// Obtenir le nœud actuel
const currentNode = computed(() => {
  if (!workflow.value) return null
  return workflow.value.nodes.find(node => node.id === currentNodeId.value)
})

// Obtenir le progrès
const progress = computed(() => {
  if (!workflow.value) return 0
  const questionNodes = workflow.value.nodes.filter(n => n.type === 'question')
  const answeredQuestions = Object.keys(responses.value).filter(id => 
    workflow.value!.nodes.find(n => n.id === id && n.type === 'question')
  )
  return (answeredQuestions.length / questionNodes.length) * 100
})

// Navigation
const goToNext = () => {
  if (!workflow.value || !currentNode.value) return
  
  // Sauvegarder dans l'historique seulement si ce n'est pas un trigger ou une condition
  if (currentNode.value.type !== 'trigger' && currentNode.value.type !== 'condition') {
    if (!questionHistory.value.includes(currentNodeId.value)) {
      questionHistory.value.push(currentNodeId.value)
    }
  }
  
  // Trouver les edges sortants
  const outgoingEdges = workflow.value.edges.filter(edge => edge.source === currentNodeId.value)
  
  if (outgoingEdges.length === 0) {
    // Fin du questionnaire
    isCompleted.value = true
    return
  }
  
  // Si c'est un nœud de condition, évaluer la condition
  if (currentNode.value.type === 'condition') {
    const previousNodeId = getPreviousNodeId()
    const response = responses.value[previousNodeId]
    
    console.log('🔍 Évaluation condition:', {
      previousNodeId,
      response,
      responseType: Array.isArray(response) ? 'array' : typeof response,
      conditionData: currentNode.value.data,
      branches: currentNode.value.data.branches,
      outgoingEdges: outgoingEdges.map(e => ({ 
        target: e.target, 
        label: e.label, 
        sourceHandle: e.sourceHandle,
        data: e.data 
      }))
    })
    
    let targetEdge: WorkflowEdge | undefined
    
    // Normaliser la réponse pour la comparaison
    const normalizeValue = (val: string) => val?.toString().toLowerCase().trim()
    
    // Stratégie simplifiée de correspondance
    if (Array.isArray(response)) {
      // Pour les checkbox
      if (response.length > 1) {
        // Si plusieurs réponses, chercher d'abord une branche "Plusieurs"
        targetEdge = outgoingEdges.find(edge => {
          const edgeLabel = normalizeValue(edge.label || '')
          return edgeLabel === 'plusieurs'
        })
      }
      
      // Si pas trouvé ou une seule réponse, chercher par valeur exacte
      if (!targetEdge && response.length > 0) {
        for (const value of response) {
          const normalizedResponse = normalizeValue(value)
          
          // Chercher d'abord par label exact
          targetEdge = outgoingEdges.find(edge => {
            const edgeLabel = normalizeValue(edge.label || '')
            return edgeLabel === normalizedResponse
          })
          
          // Si pas trouvé, chercher dans les branches du node condition
          if (!targetEdge && currentNode.value.data.branches) {
            console.log('🔎 Recherche dans les branches:', {
              normalizedResponse,
              branches: currentNode.value.data.branches.map(b => ({
                id: b.id,
                label: b.label,
                value: b.value,
                normalizedLabel: normalizeValue(b.label),
                normalizedValue: normalizeValue(b.value || ''),
                values: b.values
              }))
            })
            
            const matchingBranch = currentNode.value.data.branches.find(branch => {
              // Pour les conditions multiples avec des valeurs
              if (branch.values && Array.isArray(branch.values)) {
                return branch.values.some(v => normalizeValue(v) === normalizedResponse)
              }
              // Pour les conditions simples
              return normalizeValue(branch.label) === normalizedResponse ||
                     normalizeValue(branch.value || '') === normalizedResponse
            })
            
            if (matchingBranch) {
              console.log('📍 Branche correspondante trouvée:', matchingBranch)
              targetEdge = outgoingEdges.find(edge => 
                edge.sourceHandle === matchingBranch.id
              )
              console.log('🎯 Edge correspondant:', targetEdge ? 'trouvé' : 'non trouvé', targetEdge)
            } else {
              // Stratégie de fallback : chercher par position si les branches ont des labels génériques
              console.log('⚠️ Aucune branche ne correspond par valeur, tentative par position')
              
              // Obtenir la question précédente pour connaître l'ordre des options
              const previousNode = workflow.value?.nodes.find(n => n.id === previousNodeId)
              if (previousNode?.data?.options) {
                const optionIndex = previousNode.data.options.findIndex(opt => 
                  normalizeValue(opt) === normalizedResponse
                )
                
                if (optionIndex !== -1 && currentNode.value.data.branches[optionIndex]) {
                  const branchByPosition = currentNode.value.data.branches[optionIndex]
                  console.log(`📍 Branche trouvée par position [${optionIndex}]:`, branchByPosition)
                  
                  targetEdge = outgoingEdges.find(edge => 
                    edge.sourceHandle === branchByPosition.id
                  )
                }
              }
            }
          }
          
          if (targetEdge) {
            console.log('✅ Correspondance trouvée pour:', value, '→', targetEdge.label)
            break
          }
        }
      }
    } else if (response !== undefined && response !== null && response !== '') {
      // Pour les radio/text/number/scale
      const normalizedResponse = normalizeValue(response.toString())
      
      // Chercher d'abord par label exact
      targetEdge = outgoingEdges.find(edge => {
        const edgeLabel = normalizeValue(edge.label || '')
        return edgeLabel === normalizedResponse
      })
      
      // Si pas trouvé, chercher dans les branches du node condition
      if (!targetEdge && currentNode.value.data.branches) {
        const matchingBranch = currentNode.value.data.branches.find(branch => 
          normalizeValue(branch.label) === normalizedResponse ||
          normalizeValue(branch.value || '') === normalizedResponse
        )
        
        if (matchingBranch) {
          targetEdge = outgoingEdges.find(edge => 
            edge.sourceHandle === matchingBranch.id
          )
          console.log('✅ Correspondance trouvée via branche:', matchingBranch.label, '→', targetEdge?.label)
        }
      }
    }
    
    // Si pas de correspondance, prendre la branche par défaut
    if (!targetEdge) {
      targetEdge = outgoingEdges.find(edge => {
        const edgeValue = normalizeValue(edge.label || edge.data?.conditionValue || '')
        const sourceHandle = normalizeValue(edge.sourceHandle || '')
        return edgeValue === 'autres' || 
               edgeValue === 'défaut' || 
               edgeValue === 'default' ||
               sourceHandle.includes('autres') ||
               sourceHandle.includes('default') ||
               sourceHandle.includes('défaut')
      })
      
      // Si toujours pas trouvé, prendre la première branche disponible
      if (!targetEdge && outgoingEdges.length > 0) {
        console.warn('⚠️ Aucune branche correspondante trouvée, utilisation de la première branche')
        targetEdge = outgoingEdges[0]
      }
    }
    
    if (targetEdge) {
      console.log('✅ Branche sélectionnée:', {
        label: targetEdge.label,
        sourceHandle: targetEdge.sourceHandle,
        target: targetEdge.target,
        targetNode: workflow.value?.nodes.find(n => n.id === targetEdge.target)?.type
      })
      currentNodeId.value = targetEdge.target
    } else {
      console.error('❌ Aucune branche trouvée pour la condition', {
        response,
        availableEdges: outgoingEdges.map(e => ({
          label: e.label,
          sourceHandle: e.sourceHandle
        })),
        branches: currentNode.value.data.branches
      })
    }
  } else {
    // Navigation normale
    const nextEdge = outgoingEdges[0]
    if (nextEdge) {
      currentNodeId.value = nextEdge.target
    }
  }
  
  // Si on arrive sur un nœud 'end', marquer comme terminé
  const newNode = workflow.value.nodes.find(n => n.id === currentNodeId.value)
  if (newNode?.type === 'end') {
    isCompleted.value = true
  }
}

// Obtenir l'ID du node précédent (ignorer les conditions)
const getPreviousNodeId = () => {
  // Chercher le dernier node qui n'est pas une condition
  for (let i = questionHistory.value.length - 1; i >= 0; i--) {
    const nodeId = questionHistory.value[i]
    const node = workflow.value?.nodes.find(n => n.id === nodeId)
    if (node && node.type !== 'condition') {
      return nodeId
    }
  }
  return questionHistory.value[questionHistory.value.length - 1]
}

const goToPrevious = () => {
  if (questionHistory.value.length > 1) {
    questionHistory.value.pop()
    currentNodeId.value = questionHistory.value[questionHistory.value.length - 1]
    isCompleted.value = false
  }
}

const restart = () => {
  currentNodeId.value = 'start'
  responses.value = {}
  questionHistory.value = ['start']
  isCompleted.value = false
}

// Validation des réponses
const isCurrentQuestionAnswered = computed(() => {
  if (!currentNode.value) return false
  
  if (currentNode.value.type === 'question') {
    const response = responses.value[currentNode.value.id]
    
    switch (currentNode.value.data.questionType) {
      case 'checkbox':
        return Array.isArray(response) && response.length > 0
      case 'radio':
        return response !== undefined && response !== null && response !== ''
      case 'text':
        return response && response.trim() !== ''
      case 'number':
        return response !== undefined && response !== null
      case 'scale':
        return response !== undefined && response !== null
      default:
        return true
    }
  }
  
  return true
})

// Sauvegarder les réponses
const saveResponses = () => {
  const questionnaireName = workflow.value?.metadata?.name || 'Questionnaire'
  const data = {
    questionnaireName: questionnaireName,
    completedAt: new Date().toISOString(),
    responses: responses.value,
    responseDetails: Object.entries(responses.value).map(([nodeId, response]) => {
      const node = workflow.value?.nodes.find(n => n.id === nodeId)
      return {
        questionId: nodeId,
        question: node?.data.question || node?.data.label,
        response: response
      }
    })
  }
  
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reponses-${questionnaireName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  message.success('Réponses sauvegardées avec succès')
}

// Watcher pour gérer automatiquement les nodes de condition et initialiser les réponses
watch(currentNode, (newNode) => {
  if (newNode?.type === 'condition') {
    // Passer automatiquement les nodes de condition
    nextTick(() => {
      goToNext()
    })
  } else if (newNode?.type === 'question' && newNode.data.questionType === 'checkbox') {
    // Initialiser les réponses checkbox si elles n'existent pas
    if (!responses.value[newNode.id]) {
      responses.value[newNode.id] = []
    }
  }
}, { immediate: false })

// Charger un workflow sélectionné
const loadSelectedWorkflow = (selectedWorkflow: any) => {
  console.log('🔄 === CHARGEMENT WORKFLOW SÉLECTIONNÉ ===')
  console.log('📦 Workflow reçu:', {
    id: selectedWorkflow.id,
    name: selectedWorkflow.metadata?.name,
    structure: {
      nodes: selectedWorkflow.nodes?.length,
      edges: selectedWorkflow.edges?.length
    }
  })
  
  workflow.value = selectedWorkflow
  
  // Analyser le workflow chargé
  console.log('📊 Analyse du workflow:')
  console.log('  - Nodes:', selectedWorkflow.nodes?.map(n => ({
    id: n.id,
    type: n.type,
    label: n.data?.label,
    data: n.type === 'condition' ? {
      branches: n.data.branches,
      conditionType: n.data.conditionType
    } : undefined
  })))
  
  console.log('  - Edges:', selectedWorkflow.edges?.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    label: e.label,
    data: e.data
  })))
  
  // Analyser spécifiquement les conditions
  const conditions = selectedWorkflow.nodes?.filter(n => n.type === 'condition') || []
  conditions.forEach(cond => {
    console.log(`\n🎯 Condition détaillée: ${cond.data.label}`)
    console.log('  - ID:', cond.id)
    console.log('  - Branches:', JSON.stringify(cond.data.branches, null, 2))
    
    const edges = selectedWorkflow.edges.filter(e => e.source === cond.id)
    console.log('  - Connexions:', edges.map(e => ({
      vers: selectedWorkflow.nodes.find(n => n.id === e.target)?.data?.label || e.target,
      sourceHandle: e.sourceHandle,
      label: e.label
    })))
  })
  
  // Réinitialiser l'état
  currentNodeId.value = 'start'
  responses.value = {}
  questionHistory.value = ['start']
  isCompleted.value = false
  
  console.log('✅ Workflow chargé et état réinitialisé')
  message.success(`Questionnaire "${selectedWorkflow.metadata?.name}" chargé`)
}

// Aller au builder
const goToBuilder = () => {
  if (workflow.value) {
    localStorage.setItem('workflowToEdit', JSON.stringify(workflow.value))
  }
  window.location.href = '/questionnaire-builder'
}
</script>

<template>
  <div class="questionnaire-preview">
    <!-- Modal de sélection -->
    <WorkflowSelector 
      v-model="showWorkflowSelector"
      @select="loadSelectedWorkflow"
      @create-new="goToBuilder"
    />
    
    <div class="container">
      <!-- En-tête avec progression -->
      <div class="header">
        <div class="header-top">
          <h1>{{ workflow?.metadata?.name || 'Questionnaire' }}</h1>
          <div class="header-actions">
            <n-button 
              @click="showWorkflowSelector = true"
              quaternary
              circle
              size="small"
            >
              <template #icon>
                <Icon icon="mdi:view-list" :width="20" />
              </template>
            </n-button>
            <n-button 
              @click="goToBuilder"
              quaternary
              circle
              size="small"
            >
              <template #icon>
                <Icon icon="mdi:pencil" :width="20" />
              </template>
            </n-button>
          </div>
        </div>
        <div class="progress-section">
          <n-text depth="3">Progression</n-text>
          <n-progress 
            type="line" 
            :percentage="progress" 
            :height="8"
            :border-radius="4"
            :fill-border-radius="4"
          />
        </div>
      </div>

      <!-- État de chargement initial -->
      <div v-if="isInitializing" class="loading-state">
        <n-spin size="large" />
        <p>Chargement du questionnaire...</p>
      </div>
      
      <!-- Contenu principal -->
      <div v-else-if="currentNode && !isCompleted" class="content">
        <!-- Trigger -->
        <n-card v-if="currentNode.type === 'trigger'" class="question-card">
          <h2>{{ currentNode.data.label }}</h2>
          <p>Bienvenue dans ce questionnaire qui vous aidera à identifier et libérer vos blocages émotionnels.</p>
          <n-button quaternary size="large" @click="goToNext">
            Commencer
            <template #icon>
              <Icon icon="mdi:arrow-right" :width="20" />
            </template>
          </n-button>
        </n-card>

        <!-- Question -->
        <n-card v-else-if="currentNode.type === 'question'" class="question-card">
          <h2>{{ currentNode.data.question }}</h2>
          
          <!-- Checkbox -->
          <n-checkbox-group 
            v-if="currentNode.data.questionType === 'checkbox'"
            v-model:value="responses[currentNode.id]"
            @update:value="(value) => { responses[currentNode.id] = value || [] }"
            class="options-group"
          >
            <n-space vertical>
              <n-checkbox 
                v-for="option in currentNode.data.options" 
                :key="option"
                :value="option"
              >
                {{ option }}
              </n-checkbox>
            </n-space>
          </n-checkbox-group>

          <!-- Radio -->
          <n-radio-group 
            v-else-if="currentNode.data.questionType === 'radio'"
            v-model:value="responses[currentNode.id]"
            class="options-group"
          >
            <n-space vertical>
              <n-radio 
                v-for="option in currentNode.data.options" 
                :key="option"
                :value="option"
              >
                {{ option }}
              </n-radio>
            </n-space>
          </n-radio-group>

          <!-- Text -->
          <n-input 
            v-else-if="currentNode.data.questionType === 'text'"
            v-model:value="responses[currentNode.id]"
            type="textarea"
            placeholder="Entrez votre réponse..."
            :rows="4"
            class="text-input"
          />

          <!-- Number -->
          <n-input-number 
            v-else-if="currentNode.data.questionType === 'number'"
            v-model:value="responses[currentNode.id]"
            placeholder="Entrez un nombre"
            class="number-input"
          />

          <!-- Scale -->
          <div v-else-if="currentNode.data.questionType === 'scale'" class="scale-input">
            <n-slider 
              v-model:value="responses[currentNode.id]"
              :min="currentNode.data.scaleMin || 1"
              :max="currentNode.data.scaleMax || 5"
              :marks="{
                [currentNode.data.scaleMin || 1]: String(currentNode.data.scaleMin || 1),
                [currentNode.data.scaleMax || 5]: String(currentNode.data.scaleMax || 5)
              }"
            />
            <n-text class="scale-value">
              Valeur: {{ responses[currentNode.id] || currentNode.data.scaleMin || 1 }}
            </n-text>
          </div>
        </n-card>

        <!-- Audio -->
        <n-card v-else-if="currentNode.type === 'audio'" class="audio-card">
          <div class="audio-header">
            <Icon icon="mdi:volume-high" :width="40" color="#666" />
            <h2>{{ currentNode.data.audioTitle }}</h2>
          </div>
          
          <p v-if="currentNode.data.description">{{ currentNode.data.description }}</p>
          
          <audio 
            v-if="currentNode.data.audioUrl"
            :src="currentNode.data.audioUrl" 
            :controls="currentNode.data.showControls !== false"
            :autoplay="currentNode.data.autoPlay"
            class="audio-player"
          />
          
          <p v-else class="no-audio">
            Audio non disponible en mode preview
          </p>
          
          <div v-if="currentNode.data.duration" class="audio-duration">
            Durée: {{ currentNode.data.duration }}
          </div>
        </n-card>

        <!-- Condition (ne devrait pas être visible) -->
        <div v-else-if="currentNode.type === 'condition'" style="display: none;">
          <!-- La logique de condition est gérée automatiquement -->
        </div>
      </div>

      <!-- Résultat final -->
      <n-card v-else-if="isCompleted" class="result-card">
        <n-result
          status="success"
          title="Questionnaire terminé"
          description="Merci d'avoir complété ce questionnaire de libération émotionnelle."
        >
          <template #icon>
            <Icon icon="mdi:check-circle" :width="80" color="#666" />
          </template>
          <template #footer>
            <n-space>
              <n-button quaternary @click="saveResponses">
                <template #icon>
                  <Icon icon="mdi:content-save" :width="18" />
                </template>
                Sauvegarder mes réponses
              </n-button>
              <n-button quaternary @click="restart">
                <template #icon>
                  <Icon icon="mdi:refresh" :width="20" />
                </template>
                Refaire le questionnaire
              </n-button>
            </n-space>
          </template>
        </n-result>
      </n-card>
      
      <!-- État sans questionnaire -->
      <div v-else-if="!workflow && !isInitializing" class="empty-questionnaire">
        <n-card>
          <div class="empty-content">
            <Icon icon="mdi:book-open-outline" :width="64" color="#e5e7eb" />
            <h2>Aucun questionnaire sélectionné</h2>
            <p>Choisissez un questionnaire dans la liste pour commencer</p>
            <n-button @click="showWorkflowSelector = true" type="primary">
              <template #icon>
                <Icon icon="mdi:view-list" />
              </template>
              Voir mes questionnaires
            </n-button>
          </div>
        </n-card>
      </div>

      <!-- Navigation -->
      <div class="navigation" v-if="!isCompleted && workflow && currentNode">
        <n-button 
          quaternary
          v-if="questionHistory.length > 1 && currentNode?.type !== 'trigger'"
          @click="goToPrevious"
        >
          <template #icon>
            <Icon icon="mdi:arrow-left" :width="20" />
          </template>
          Précédent
        </n-button>
        
        <n-button 
          quaternary
          @click="goToNext"
          :disabled="currentNode?.type === 'question' && !isCurrentQuestionAnswered"
          v-if="currentNode?.type !== 'trigger'"
        >
          Suivant
          <template #icon>
            <Icon icon="mdi:arrow-right" :width="20" />
          </template>
        </n-button>
      </div>
    </div>
    
    <!-- Bouton flottant pour accès rapide -->
    <div v-if="workflow && !isInitializing" class="floating-button" @click="showWorkflowSelector = true">
      <Icon icon="mdi:view-list" :width="24" />
      <span class="floating-tooltip">Changer de questionnaire</span>
    </div>
  </div>
</template>

<style scoped>
.questionnaire-preview {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  margin-bottom: 32px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 28px;
  color: #333;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.progress-section {
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.question-card,
.audio-card,
.result-card {
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.question-card h2,
.audio-card h2 {
  font-size: 20px;
  color: #333;
  margin-bottom: 24px;
  line-height: 1.4;
}

.options-group {
  margin-bottom: 24px;
}

:deep(.n-checkbox),
:deep(.n-radio) {
  margin-bottom: 12px;
  font-size: 16px;
}

.text-input,
.number-input {
  margin-bottom: 24px;
}

.scale-input {
  margin: 24px 0;
  padding: 0 16px;
}

.scale-value {
  display: block;
  text-align: center;
  margin-top: 16px;
  font-weight: 500;
}

.audio-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.audio-player {
  width: 100%;
  margin: 16px 0;
}

.no-audio {
  padding: 32px;
  text-align: center;
  background: #f8f9fa;
  border-radius: 8px;
  color: #666;
  font-style: italic;
}

.audio-duration {
  text-align: center;
  color: #666;
  font-size: 14px;
}

.navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
}

.navigation n-button {
  min-width: 120px;
}

/* État de chargement */
.loading-state {
  text-align: center;
  padding: 120px 20px;
}

.loading-state p {
  margin-top: 24px;
  font-size: 16px;
  color: #6b7280;
}

/* État sans questionnaire */
.empty-questionnaire {
  margin-top: 60px;
}

.empty-content {
  text-align: center;
  padding: 60px 20px;
}

.empty-content h2 {
  margin: 24px 0 12px;
  font-size: 24px;
  color: #374151;
}

.empty-content p {
  margin: 0 0 32px;
  font-size: 16px;
  color: #6b7280;
}

/* Bouton flottant */
.floating-button {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  z-index: 100;
}

.floating-button:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
}

.floating-button:hover .floating-tooltip {
  opacity: 1;
  transform: translateX(-110%) translateY(-50%);
}

.floating-tooltip {
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateX(-100%) translateY(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  white-space: nowrap;
  opacity: 0;
  transition: all 0.3s ease;
  pointer-events: none;
}

.floating-tooltip::after {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid rgba(0, 0, 0, 0.8);
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
}

/* Responsive */
@media (max-width: 768px) {
  .questionnaire-preview {
    padding: 16px;
  }
  
  .header h1 {
    font-size: 24px;
  }
  
  .question-card h2,
  .audio-card h2 {
    font-size: 18px;
  }
  
  .floating-button {
    bottom: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
  }
  
  .floating-tooltip {
    display: none;
  }
}
</style>