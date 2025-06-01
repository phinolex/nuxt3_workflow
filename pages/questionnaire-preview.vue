<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
}

// État du questionnaire
const workflow = ref<{ nodes: WorkflowNode[], edges: WorkflowEdge[] } | null>(null)
const currentNodeId = ref<string>('start')
const responses = ref<Record<string, any>>({})
const questionHistory = ref<string[]>(['start'])
const isCompleted = ref(false)

// Charger le workflow depuis localStorage
onMounted(() => {
  const savedWorkflow = localStorage.getItem('currentQuestionnaire')
  if (savedWorkflow) {
    try {
      workflow.value = JSON.parse(savedWorkflow)
    } catch (error) {
      message.error('Erreur lors du chargement du questionnaire')
    }
  }
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
  
  // Trouver les edges sortants
  const outgoingEdges = workflow.value.edges.filter(edge => edge.source === currentNodeId.value)
  
  if (outgoingEdges.length === 0) {
    // Fin du questionnaire
    isCompleted.value = true
    return
  }
  
  // Si c'est un nœud de condition, évaluer la condition
  if (currentNode.value.type === 'condition') {
    const previousQuestionId = questionHistory.value[questionHistory.value.length - 2]
    const response = responses.value[previousQuestionId]
    
    let targetEdge: WorkflowEdge | undefined
    
    // Logique spécifique pour la question 3
    if (currentNode.value.data.label === 'Vérifier réponse Q3') {
      if (Array.isArray(response) && response.length > 1) {
        // Plusieurs options cochées
        targetEdge = outgoingEdges.find(edge => edge.label === 'Plusieurs')
      } else if (Array.isArray(response) && response.length === 1) {
        // Une seule option cochée
        const selectedOption = response[0]
        targetEdge = outgoingEdges.find(edge => edge.label === selectedOption)
      }
    }
    
    // Si pas de correspondance, prendre le premier edge
    if (!targetEdge) {
      targetEdge = outgoingEdges[0]
    }
    
    currentNodeId.value = targetEdge.target
    questionHistory.value.push(targetEdge.target)
  } else {
    // Navigation normale
    const nextEdge = outgoingEdges[0]
    currentNodeId.value = nextEdge.target
    questionHistory.value.push(nextEdge.target)
  }
  
  // Si on arrive sur un nœud 'end', marquer comme terminé
  if (currentNode.value?.type === 'end') {
    isCompleted.value = true
  }
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
  const data = {
    questionnaireName: 'Questionnaire de libération émotionnelle',
    completedAt: new Date().toISOString(),
    responses: responses.value,
    responseDetails: Object.entries(responses.value).map(([nodeId, response]) => {
      const node = workflow.value?.nodes.find(n => n.id === nodeId)
      return {
        questionId: nodeId,
        question: node?.data.question,
        response: response
      }
    })
  }
  
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reponses-questionnaire-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  message.success('Réponses sauvegardées avec succès')
}
</script>

<template>
  <div class="questionnaire-preview">
    <div class="container">
      <!-- En-tête avec progression -->
      <div class="header">
        <h1>Questionnaire de libération émotionnelle</h1>
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

      <!-- Contenu principal -->
      <div class="content" v-if="currentNode && !isCompleted">
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

      <!-- Navigation -->
      <div class="navigation" v-if="!isCompleted">
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

.header h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 16px;
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
}
</style>