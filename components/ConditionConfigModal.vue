<template>
  <n-modal
    v-model:show="show"
    :mask-closable="false"
    :closable="false"
    :preset="'card'"
    :style="{ 
      width: '90vw',
      maxWidth: '1400px',
      height: '85vh',
      display: 'flex',
      flexDirection: 'column'
    }"
  >
    <template #header>
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div>
          <h2 style="margin: 0; font-size: 24px;">
            {{ isEdit ? 'Modifier la condition' : 'Créer une condition' }}
          </h2>
          <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">
            Définissez les règles pour diriger vos participants selon leurs réponses
          </p>
        </div>
        <n-button text @click="show = false" style="position: absolute; top: 16px; right: 16px;">
          <template #icon>
            <n-icon size="20"><Icon icon="mdi:close" /></n-icon>
          </template>
        </n-button>
      </div>
    </template>

    <div class="condition-modal-container">
      <!-- Contenu principal -->
      <div class="modal-main">
        <div class="condition-modal">
          <!-- Contenu principal -->
          <div class="modal-body">
            <!-- Info sur la question évaluée -->
            <div class="evaluated-question-info" v-if="previousNode">
              <n-alert type="info" :bordered="false">
                <template #icon>
                  <Icon icon="mdi:help-circle" />
                </template>
                <strong>Question évaluée :</strong> {{ previousNode.data.label }} - {{ previousNode.data.question }}
              </n-alert>
            </div>

            <!-- Étape 1: Nom de la condition -->
            <div class="form-section">
              <div class="section-header">
                <div class="step-indicator">1</div>
                <div class="section-info">
                  <h3>Nommez votre condition</h3>
                  <p>Un nom descriptif pour identifier cette règle</p>
                </div>
              </div>
              <div class="section-content">
                <input
                  v-model="formData.label"
                  type="text"
                  class="modern-input"
                  placeholder="Ex: Redirection selon la famille"
                />
              </div>
            </div>

            <!-- Étape 2: Type de condition -->
            <div class="form-section">
              <div class="section-header">
                <div class="step-indicator">2</div>
                <div class="section-info">
                  <h3>Comment analyser la réponse ?</h3>
                  <p>Type détecté : {{ detectedQuestionType }}</p>
                </div>
              </div>
              <div class="section-content">
                <div class="condition-types">
                  <div 
                    v-for="type in filteredConditionTypes"
                    :key="type.value"
                    class="condition-type-card"
                    :class="{ active: formData.conditionType === type.value }"
                    @click="formData.conditionType = type.value"
                  >
                    <div class="type-icon">
                      <Icon :icon="type.icon" :width="24" />
                    </div>
                    <h4>{{ type.label }}</h4>
                    <p>{{ type.description }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Étape 3: Configuration des chemins -->
            <div class="form-section">
              <div class="section-header">
                <div class="step-indicator">3</div>
                <div class="section-info">
                  <h3>Définir les chemins</h3>
                  <p>Créez les différents parcours selon les réponses</p>
                </div>
              </div>
              <div class="section-content">
                <transition-group name="path-list" tag="div" class="paths-container">
                  <div 
                    v-for="(branch, index) in formData.branches" 
                    :key="branch.id || `branch-${index}`"
                    class="path-card"
                  >
                    <div class="path-header">
                      <div class="path-number">{{ index + 1 }}</div>
                      <input
                        v-model="branch.label"
                        type="text"
                        class="path-name-input"
                        placeholder="Nom du chemin"
                      />
                      <button 
                        v-if="formData.branches.length > 2"
                        class="remove-path-btn"
                        @click="removeBranch(index)"
                      >
                        <Icon icon="mdi:close" :width="16" />
                      </button>
                    </div>

                    <div class="path-condition">
                      <div class="condition-label">Si la réponse est :</div>
                      
                      <!-- Interface simplifiée selon le type -->
                      <div v-if="formData.conditionType === 'single'" class="condition-input">
                        <select v-model="branch.value" class="modern-select">
                          <option value="">Choisir une option...</option>
                          <option 
                            v-for="option in getAnswerOptions()" 
                            :key="option.value"
                            :value="option.value"
                          >
                            {{ option.label }}
                          </option>
                        </select>
                      </div>

                      <div v-else-if="formData.conditionType === 'multiple'" class="condition-input">
                        <div class="multiple-condition-selector">
                          <select v-model="branch.multipleMode" class="modern-select mode-select">
                            <option value="specific">Options spécifiques</option>
                            <option value="count">Nombre de réponses</option>
                            <option value="all">Toutes les réponses</option>
                            <option value="none">Aucune réponse</option>
                          </select>
                          
                          <div v-if="branch.multipleMode === 'specific'" class="checkbox-group">
                            <label 
                              v-for="option in getAnswerOptions()" 
                              :key="`${branch.id || index}-${option.value}`"
                              class="modern-checkbox"
                            >
                              <input 
                                type="checkbox" 
                                :value="option.value"
                                :checked="branch.values?.includes(option.value)"
                                @change="toggleCheckbox(branch, option.value)"
                              />
                              <span class="checkbox-label">{{ option.label }}</span>
                            </label>
                          </div>
                          
                          <div v-else-if="branch.multipleMode === 'count'" class="count-selector">
                            <div class="count-input-group">
                              <select v-model="branch.countOperator" class="modern-select operator-select">
                                <option value=">=">Au moins</option>
                                <option value="==">Exactement</option>
                                <option value="<=">Au plus</option>
                                <option value=">">Plus de</option>
                                <option value="<">Moins de</option>
                              </select>
                              <input
                                v-model.number="branch.countValue"
                                type="number"
                                class="modern-input number-input"
                                placeholder="Nombre"
                                min="0"
                                :max="getAnswerOptions().length"
                              />
                              <span class="count-suffix">réponse(s) sélectionnée(s)</span>
                            </div>
                          </div>
                          
                          <div v-else-if="branch.multipleMode === 'all'" class="info-message">
                            <Icon icon="mdi:information" :width="16" />
                            <span>Toutes les options doivent être sélectionnées</span>
                          </div>
                          
                          <div v-else-if="branch.multipleMode === 'none'" class="info-message">
                            <Icon icon="mdi:information" :width="16" />
                            <span>Aucune option ne doit être sélectionnée</span>
                          </div>
                        </div>
                      </div>

                      <div v-else-if="formData.conditionType === 'count'" class="condition-input">
                        <div class="operator-input">
                          <select v-model="branch.operator" class="modern-select operator-select">
                            <option v-for="op in countOperators" :key="op.value" :value="op.value">
                              {{ op.label }}
                            </option>
                          </select>
                          <input
                            v-model.number="branch.count"
                            type="number"
                            class="modern-input number-input"
                            placeholder="Nombre"
                            min="0"
                          />
                        </div>
                      </div>

                      <div v-else-if="formData.conditionType === 'contains'" class="condition-input">
                        <input
                          v-model="branch.contains"
                          type="text"
                          class="modern-input"
                          placeholder="Contient le texte..."
                        />
                      </div>

                      <div v-else-if="formData.conditionType === 'number'" class="condition-input">
                        <div class="operator-input">
                          <select v-model="branch.operator" class="modern-select operator-select">
                            <option v-for="op in numberOperators" :key="op.value" :value="op.value">
                              {{ op.label }}
                            </option>
                          </select>
                          <input
                            v-model.number="branch.numberValue"
                            type="number"
                            class="modern-input number-input"
                            placeholder="Valeur"
                          />
                        </div>
                      </div>

                      <div v-else-if="formData.conditionType === 'length'" class="condition-input">
                        <div class="operator-input">
                          <select v-model="branch.operator" class="modern-select operator-select">
                            <option v-for="op in lengthOperators" :key="op.value" :value="op.value">
                              {{ op.label }}
                            </option>
                          </select>
                          <input
                            v-model.number="branch.lengthValue"
                            type="number"
                            class="modern-input number-input"
                            placeholder="Nombre de caractères"
                            min="0"
                          />
                        </div>
                      </div>

                      <div v-else-if="formData.conditionType === 'empty'" class="condition-input">
                        <div class="radio-group">
                          <label class="modern-radio">
                            <input type="radio" v-model="branch.isEmpty" :value="true" />
                            <span>Si la réponse est vide</span>
                          </label>
                          <label class="modern-radio">
                            <input type="radio" v-model="branch.isEmpty" :value="false" />
                            <span>Si la réponse n'est pas vide</span>
                          </label>
                        </div>
                      </div>

                      <div v-else-if="formData.conditionType === 'custom'" class="condition-input">
                        <textarea
                          v-model="branch.condition"
                          class="modern-textarea"
                          placeholder="Condition personnalisée (ex: response.includes('Maman') && responseCount > 1)"
                          rows="3"
                        ></textarea>
                        <p class="helper-text">
                          Variables : response (réponse), responseCount (nombre de réponses), responseLength (longueur du texte)
                        </p>
                      </div>
                    </div>
                  </div>
                </transition-group>

                <button class="add-path-btn" @click="addBranch">
                  <Icon icon="mdi:plus" :width="20" />
                  <span>Ajouter un chemin</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Panneau latéral droit : Aperçu -->
      <div class="preview-panel">
        <h3 class="preview-title">Résumé des conditions</h3>
        
        <div v-if="!hasValidConditions" class="preview-empty">
          <Icon icon="mdi:eye-off-outline" :width="32" />
          <p>Configurez les chemins pour voir le résumé</p>
        </div>

        <div v-else class="preview-content">
          <!-- Résumé des conditions configurées -->
          <div class="conditions-summary">
            <div 
              v-for="(branch, index) in formData.branches" 
              :key="branch.id || index"
              class="condition-summary-card"
            >
              <div class="condition-summary-header">
                <span class="condition-number">{{ index + 1 }}</span>
                <span class="condition-name">{{ branch.label }}</span>
              </div>
              
              <div class="condition-summary-content">
                <div class="condition-if">
                  <span class="condition-keyword">SI</span>
                  <span class="condition-description">
                    {{ getConditionDescription(branch) }}
                  </span>
                </div>
                <div class="condition-then">
                  <span class="condition-keyword">ALORS</span>
                  <span class="condition-action">
                    Diriger vers "{{ branch.label }}"
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <n-button @click="show = false" size="large">
        Annuler
      </n-button>
      <n-button 
        type="primary"
        size="large"
        @click="handleSubmit"
        :disabled="!isFormValid"
      >
        <template #icon>
          <Icon icon="mdi:check" />
        </template>
        {{ isEdit ? 'Enregistrer' : 'Créer la condition' }}
      </n-button>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { NModal, NButton, NIcon, NSpace, NAlert, useMessage } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useVueFlow } from '@vue-flow/core'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  nodeData: {
    type: Object,
    default: null
  },
  nodeId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const { getNodes, getEdges } = useVueFlow()
const message = useMessage()
const show = ref(false)
const isEdit = ref(false)

// Trouver le node précédent
const previousNode = computed(() => {
  if (!props.nodeId) return null
  
  const edges = getEdges.value
  const nodes = getNodes.value
  
  // Trouver l'edge qui pointe vers le node condition
  const incomingEdge = edges.find(edge => edge.target === props.nodeId)
  if (!incomingEdge) return null
  
  // Trouver le node source
  const sourceNode = nodes.find(node => node.id === incomingEdge.source)
  return sourceNode
})

// Détecter le type de question
const detectedQuestionType = computed(() => {
  if (!previousNode.value) return 'Non détecté'
  const questionType = previousNode.value.data.questionType
  
  switch (questionType) {
    case 'radio':
      return 'Choix unique (radio)'
    case 'checkbox':
      return 'Choix multiples (checkbox)'
    case 'text':
      return 'Champ texte'
    case 'number':
      return 'Champ numérique'
    default:
      return 'Type inconnu'
  }
})

// Types de conditions avec toutes les options
const allConditionTypes = [
  {
    value: 'single',
    label: 'Choix unique',
    description: 'Une seule réponse sélectionnée',
    icon: 'mdi:radiobox-marked',
    forTypes: ['radio']
  },
  {
    value: 'multiple',
    label: 'Choix multiples',
    description: 'Plusieurs réponses possibles',
    icon: 'mdi:checkbox-marked-outline',
    forTypes: ['checkbox']
  },
  {
    value: 'count',
    label: 'Nombre de réponses',
    description: 'Comparer le nombre de réponses',
    icon: 'mdi:counter',
    forTypes: ['checkbox']
  },
  {
    value: 'contains',
    label: 'Contient',
    description: 'La réponse contient un texte',
    icon: 'mdi:text-search',
    forTypes: ['text', 'checkbox']
  },
  {
    value: 'number',
    label: 'Comparaison numérique',
    description: 'Comparer des nombres',
    icon: 'mdi:numeric',
    forTypes: ['number']
  },
  {
    value: 'length',
    label: 'Longueur du texte',
    description: 'La longueur de la réponse',
    icon: 'mdi:text-long',
    forTypes: ['text']
  },
  {
    value: 'empty',
    label: 'Vide ou rempli',
    description: 'Vérifier si vide',
    icon: 'mdi:checkbox-blank-outline',
    forTypes: ['text', 'number', 'radio', 'checkbox']
  },
  {
    value: 'custom',
    label: 'Personnalisée',
    description: 'Condition complexe',
    icon: 'mdi:code-braces',
    forTypes: ['all']
  }
]

// Filtrer les types de conditions selon le type de question
const filteredConditionTypes = computed(() => {
  if (!previousNode.value) return allConditionTypes
  
  const questionType = previousNode.value.data.questionType
  return allConditionTypes.filter(type => 
    type.forTypes.includes('all') || type.forTypes.includes(questionType)
  )
})

// Opérateurs
const countOperators = [
  { label: 'Est égal à', value: '==' },
  { label: 'Est différent de', value: '!=' },
  { label: 'Est supérieur à', value: '>' },
  { label: 'Est supérieur ou égal à', value: '>=' },
  { label: 'Est inférieur à', value: '<' },
  { label: 'Est inférieur ou égal à', value: '<=' }
]

const numberOperators = [...countOperators]
const lengthOperators = [...countOperators]

const getDefaultFormData = () => ({
  label: '',
  targetQuestion: '',
  conditionType: 'single',
  description: '',
  branches: [
    { 
      id: 'branch-1', 
      label: 'Chemin principal', 
      value: '',
      values: [],
      contains: '',
      condition: '',
      operator: '==',
      count: 1,
      numberValue: 0,
      lengthValue: 0,
      isEmpty: true,
      multipleMode: 'specific',
      countOperator: '>=',
      countValue: 1
    },
    { 
      id: 'branch-2', 
      label: 'Chemin alternatif', 
      value: '',
      values: [],
      contains: '',
      condition: '',
      operator: '==',
      count: 1,
      numberValue: 0,
      lengthValue: 0,
      isEmpty: false,
      multipleMode: 'specific',
      countOperator: '>=',
      countValue: 1
    }
  ]
})

const formData = reactive(getDefaultFormData())

// Options de réponses basées sur la question précédente
const getAnswerOptions = () => {
  if (previousNode.value && previousNode.value.data.options) {
    return previousNode.value.data.options.map((opt: string) => ({
      label: opt,
      value: opt
    }))
  }
  return []
}

// Gérer les checkboxes manuellement pour éviter le bug
const toggleCheckbox = (branch: any, value: string) => {
  if (!branch.values) {
    branch.values = []
  }
  
  const index = branch.values.indexOf(value)
  if (index > -1) {
    branch.values.splice(index, 1)
  } else {
    branch.values.push(value)
  }
}

const addBranch = () => {
  const branchNumber = formData.branches.length + 1
  formData.branches.push({
    id: props.nodeId ? `${props.nodeId}-branch-${branchNumber}` : `branch-${branchNumber}`,
    label: `Chemin ${branchNumber}`,
    value: '',
    values: [],
    contains: '',
    condition: '',
    operator: '==',
    count: 1,
    numberValue: 0,
    lengthValue: 0,
    isEmpty: true,
    multipleMode: 'specific',
    countOperator: '>=',
    countValue: 1
  })
}

const removeBranch = (index: number) => {
  if (formData.branches.length > 2) {
    formData.branches.splice(index, 1)
  }
}

const isFormValid = computed(() => {
  return formData.label.trim() !== '' &&
         formData.conditionType !== '' &&
         formData.branches.length >= 2 &&
         formData.branches.every(branch => branch.label.trim() !== '')
})

const hasValidConditions = computed(() => {
  return formData.branches.some(branch => {
    switch (formData.conditionType) {
      case 'single':
        return branch.value !== ''
      case 'multiple':
        if (branch.multipleMode === 'specific') {
          return branch.values && branch.values.length > 0
        }
        return true // Les autres modes sont toujours valides
      case 'count':
        return true
      case 'contains':
        return branch.contains !== ''
      case 'number':
        return true
      case 'length':
        return true
      case 'empty':
        return true
      case 'custom':
        return branch.condition !== ''
      default:
        return false
    }
  })
})

// Obtenir la description d'une condition
const getConditionDescription = (branch: any) => {
  switch (formData.conditionType) {
    case 'single':
      return branch.value ? `La réponse est "${branch.value}"` : 'Condition non configurée'
    case 'multiple':
      if (branch.multipleMode === 'specific') {
        if (branch.values && branch.values.length > 0) {
          if (branch.values.length === 1) {
            return `"${branch.values[0]}" est sélectionné`
          } else {
            return `Un de ces choix est sélectionné : ${branch.values.map(v => `"${v}"`).join(', ')}`
          }
        }
        return 'Aucun choix configuré'
      } else if (branch.multipleMode === 'count') {
        const operator = getOperatorText(branch.countOperator)
        return `${operator} ${branch.countValue} réponse(s) sélectionnée(s)`
      } else if (branch.multipleMode === 'all') {
        return 'Toutes les options sont sélectionnées'
      } else if (branch.multipleMode === 'none') {
        return 'Aucune option n\'est sélectionnée'
      }
      return 'Mode non configuré'
    case 'count':
      return `Le nombre de réponses ${getOperatorText(branch.operator)} ${branch.count}`
    case 'contains':
      return branch.contains ? `La réponse contient "${branch.contains}"` : 'Texte non configuré'
    case 'number':
      return `La valeur ${getOperatorText(branch.operator)} ${branch.numberValue}`
    case 'length':
      return `La longueur du texte ${getOperatorText(branch.operator)} ${branch.lengthValue} caractères`
    case 'empty':
      return branch.isEmpty ? 'La réponse est vide' : 'La réponse n\'est pas vide'
    case 'custom':
      return branch.condition || 'Condition personnalisée non configurée'
    default:
      return 'Type de condition inconnu'
  }
}

const getOperatorText = (operator: string) => {
  const ops: Record<string, string> = {
    '==': 'est égal à',
    '!=': 'est différent de',
    '>': 'est supérieur à',
    '>=': 'est supérieur ou égal à',
    '<': 'est inférieur à',
    '<=': 'est inférieur ou égal à'
  }
  return ops[operator] || operator
}

const convertToCondition = (branch: any) => {
  switch (formData.conditionType) {
    case 'single':
      return `response === '${branch.value}'`
    case 'multiple':
      if (branch.multipleMode === 'specific') {
        const values = branch.values || []
        return values.length > 0 
          ? `[${values.map(v => `'${v}'`).join(', ')}].some(v => response.includes(v))`
          : 'false'
      } else if (branch.multipleMode === 'count') {
        return `response.length ${branch.countOperator} ${branch.countValue}`
      } else if (branch.multipleMode === 'all') {
        const totalOptions = getAnswerOptions().length
        return `response.length === ${totalOptions}`
      } else if (branch.multipleMode === 'none') {
        return `response.length === 0`
      }
      return 'true'
    case 'count':
      return `responseCount ${branch.operator} ${branch.count}`
    case 'contains':
      return `response.includes('${branch.contains}')`
    case 'number':
      return `Number(response) ${branch.operator} ${branch.numberValue}`
    case 'length':
      return `response.toString().length ${branch.operator} ${branch.lengthValue}`
    case 'empty':
      return branch.isEmpty ? '!response || response === ""' : 'response && response !== ""'
    case 'custom':
      return branch.condition || 'true'
    default:
      return 'true'
  }
}

watch(() => props.modelValue, (val) => {
  show.value = val
  if (val) {
    isEdit.value = !!props.nodeData
    
    // Réinitialiser avec les valeurs par défaut (copie profonde)
    formData.label = ''
    formData.targetQuestion = ''
    formData.conditionType = 'single'
    formData.description = ''
    formData.branches = [
      { 
        id: props.nodeId ? `${props.nodeId}-chemin-principal` : 'chemin-principal', 
        label: 'Chemin principal', 
        value: '',
        values: [],
        contains: '',
        condition: '',
        operator: '==',
        count: 1,
        numberValue: 0,
        lengthValue: 0,
        isEmpty: true,
        multipleMode: 'specific',
        countOperator: '>=',
        countValue: 1
      },
      { 
        id: props.nodeId ? `${props.nodeId}-chemin-alternatif` : 'chemin-alternatif', 
        label: 'Chemin alternatif', 
        value: '',
        values: [],
        contains: '',
        condition: '',
        operator: '==',
        count: 1,
        numberValue: 0,
        lengthValue: 0,
        isEmpty: false,
        multipleMode: 'specific',
        countOperator: '>=',
        countValue: 1
      }
    ]
    
    if (props.nodeData) {
      // Copier les données existantes
      Object.keys(props.nodeData).forEach(key => {
        if (key in formData) {
          if (key === 'branches' && Array.isArray(props.nodeData[key])) {
            // Traiter les branches spécialement pour s'assurer que toutes les propriétés sont présentes
            formData.branches = props.nodeData[key].map((branch: any) => ({
              id: branch.id || '',
              label: branch.label || '',
              value: branch.value || '',
              values: Array.isArray(branch.values) ? [...branch.values] : [],
              contains: branch.contains || '',
              condition: branch.condition || '',
              operator: branch.operator || '==',
              count: branch.count || 1,
              numberValue: branch.numberValue || 0,
              lengthValue: branch.lengthValue || 0,
              isEmpty: branch.isEmpty !== undefined ? branch.isEmpty : true,
              multipleMode: branch.multipleMode || 'specific',
              countOperator: branch.countOperator || '>=',
              countValue: branch.countValue || 1
            }))
          } else {
            formData[key] = props.nodeData[key]
          }
        }
      })
      
      // Si pas de conditionType défini ou conditionType par défaut, déterminer le type approprié
      if (!formData.conditionType || formData.conditionType === 'single') {
        const questionType = formData.targetQuestion ? 
          getNodes.value.find(n => n.id === formData.targetQuestion)?.data.questionType :
          previousNode.value?.data.questionType
        
        if (questionType === 'checkbox') {
          formData.conditionType = 'multiple'
        } else if (questionType === 'radio') {
          formData.conditionType = 'single'
        } else if (questionType === 'number') {
          formData.conditionType = 'number'
        } else if (questionType === 'text') {
          formData.conditionType = 'contains'
        }
      }
    } else {
      // Initialiser avec des valeurs par défaut basées sur le node précédent
      const questionType = previousNode.value?.data.questionType
      let defaultConditionType = 'single'
      
      if (questionType === 'checkbox') {
        defaultConditionType = 'multiple'
      } else if (questionType === 'radio') {
        defaultConditionType = 'single'
      } else if (questionType === 'number') {
        defaultConditionType = 'number'
      } else if (questionType === 'text') {
        defaultConditionType = 'contains'
      }
      
      const defaultData = getDefaultFormData()
      Object.assign(formData, {
        ...defaultData,
        conditionType: defaultConditionType,
        targetQuestion: previousNode.value?.id || '',
        branches: defaultData.branches.map((branch, index) => ({
          ...branch,
          id: `${props.nodeId}-branch-${index + 1}`,
          values: [] // S'assurer que values est initialisé comme tableau vide
        }))
      })
    }
  }
})

watch(show, (val) => {
  emit('update:modelValue', val)
})

const handleSubmit = () => {
  if (!isFormValid.value) {
    message.warning('Veuillez remplir tous les champs requis')
    return
  }

  const data = {
    label: formData.label,
    conditionType: formData.conditionType,
    description: formData.description,
    targetQuestion: previousNode.value?.id || formData.targetQuestion,
    branches: formData.branches.map(branch => {
      // Générer un ID basé sur la valeur pour une meilleure correspondance
      let branchId = branch.id
      if (formData.conditionType === 'single' && branch.value) {
        // Pour les conditions simples, utiliser la valeur comme base de l'ID
        branchId = `${props.nodeId}-${branch.value.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      } else if (branch.isDefault) {
        branchId = `${props.nodeId}-default`
      } else {
        branchId = branch.id || `${props.nodeId}-${branch.label.toLowerCase().replace(/\s+/g, '-')}`
      }
      
      return {
        id: branchId,
        label: branch.label,
        condition: convertToCondition(branch),
        // Preserve all branch properties for persistence
        value: branch.value,
        values: branch.values || [],
        contains: branch.contains,
        operator: branch.operator,
        count: branch.count,
        numberValue: branch.numberValue,
        lengthValue: branch.lengthValue,
        isEmpty: branch.isEmpty,
        multipleMode: branch.multipleMode,
        countOperator: branch.countOperator,
        countValue: branch.countValue,
        // Ajouter les valeurs attendues pour faciliter le matching
        expectedValues: formData.conditionType === 'single' ? [branch.value] : (branch.values || [])
      }
    })
  }

  emit('confirm', data)
  show.value = false
  message.success(isEdit.value ? 'Condition modifiée' : 'Condition créée')
}
</script>

<style scoped>
.condition-modal-container {
  display: flex;
  height: calc(85vh - 140px);
}

.modal-main {
  flex: 1;
  overflow: hidden;
}

.condition-modal {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Body */
.modal-body {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 3px;
}

/* Info question évaluée */
.evaluated-question-info {
  margin-bottom: 32px;
}

/* Form sections */
.form-section {
  margin-bottom: 40px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.step-indicator {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #666;
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-info h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.section-info p {
  font-size: 14px;
  color: #6e6e6e;
  margin: 0;
}

.section-content {
  margin-left: 48px;
}

/* Inputs modernes */
.modern-input {
  width: 100%;
  padding: 14px 18px;
  border: 1px solid #e0e0e6;
  border-radius: 8px;
  font-size: 15px;
  background: #ffffff;
  transition: all 0.2s ease;
  outline: none;
}

.modern-input:focus {
  border-color: #666;
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.2);
}

.modern-input::placeholder {
  color: #a0a0a0;
}

.modern-select {
  width: 100%;
  padding: 14px 18px;
  border: 1px solid #e0e0e6;
  border-radius: 8px;
  font-size: 15px;
  background: #ffffff;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.modern-select:focus {
  border-color: #666;
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.2);
}

.modern-textarea {
  width: 100%;
  padding: 14px 18px;
  border: 1px solid #e0e0e6;
  border-radius: 8px;
  font-size: 15px;
  background: #ffffff;
  transition: all 0.2s ease;
  outline: none;
  resize: vertical;
  font-family: inherit;
}

.modern-textarea:focus {
  border-color: #666;
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.2);
}

/* Condition types */
.condition-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.condition-type-card {
  padding: 16px;
  border: 1px solid #e0e0e6;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #ffffff;
}

.condition-type-card:hover {
  border-color: #c6c6c6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.condition-type-card.active {
  border-color: #666;
  background: #f6ffed;
}

.type-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto 8px;
  border-radius: 8px;
  background: #f0f0f0;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.condition-type-card.active .type-icon {
  background: #666;
  color: white;
}

.condition-type-card h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.condition-type-card p {
  font-size: 12px;
  color: #6e6e6e;
  margin: 0;
}

/* Paths */
.paths-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.path-card {
  padding: 20px;
  border: 1px solid #e0e0e6;
  border-radius: 12px;
  background: #fafafa;
  transition: all 0.3s ease;
}

.path-list-enter-active,
.path-list-leave-active {
  transition: all 0.3s ease;
}

.path-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.path-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.path-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.path-number {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #666;
  color: white;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.path-name-input {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  background: white;
  outline: none;
  transition: all 0.2s ease;
}

.path-name-input:focus {
  box-shadow: 0 0 0 2px #666;
}

.remove-path-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #fee;
  color: #f44;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-path-btn:hover {
  background: #fdd;
  transform: scale(1.05);
}

.path-condition {
  margin-left: 40px;
}

.condition-label {
  font-size: 14px;
  color: #6e6e6e;
  margin-bottom: 8px;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.modern-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  background: white;
  border: 1px solid #e0e0e6;
  transition: all 0.2s ease;
}

.modern-checkbox:hover {
  border-color: #c6c6c6;
}

.modern-checkbox:has(input:checked) {
  border-color: #666;
  background: #f6ffed;
}

.modern-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label {
  font-size: 14px;
  color: #1a1a1a;
}

.operator-input {
  display: flex;
  gap: 12px;
  align-items: center;
}

.operator-select {
  flex: 0 0 200px;
}

.number-input {
  flex: 1;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modern-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 12px 16px;
  border-radius: 8px;
  background: white;
  border: 1px solid #e0e0e6;
  transition: all 0.2s ease;
}

.modern-radio:hover {
  border-color: #c6c6c6;
}

.modern-radio:has(input:checked) {
  border-color: #666;
  background: #f6ffed;
}

.modern-radio input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.helper-text {
  font-size: 12px;
  color: #6e6e6e;
  margin-top: 8px;
}

.add-path-btn {
  width: 100%;
  padding: 16px;
  border: 1px dashed #e0e0e6;
  border-radius: 12px;
  background: transparent;
  color: #666;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.add-path-btn:hover {
  border-color: #666;
  background: #f6ffed;
}

/* Preview panel */
.preview-panel {
  width: 380px;
  background: #f8f9fa;
  border-left: 1px solid #e0e0e6;
  padding: 24px;
  overflow-y: auto;
}

.preview-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 24px 0;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #a0a0a0;
  text-align: center;
}

.preview-empty p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Résumé des conditions */
.conditions-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.condition-summary-card {
  background: white;
  border: 1px solid #e0e0e6;
  border-radius: 12px;
  overflow: hidden;
}

.condition-summary-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e6;
}

.condition-number {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #666;
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.condition-name {
  font-weight: 500;
  color: #1a1a1a;
}

.condition-summary-content {
  padding: 16px;
}

.condition-if,
.condition-then {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.condition-then {
  margin-bottom: 0;
  margin-top: 12px;
}

.condition-keyword {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  flex-shrink: 0;
}

.condition-description,
.condition-action {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
}

.condition-action {
  font-weight: 500;
}

/* Modal Footer */
.modal-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 32px;
  background: #fff;
  border-top: 1px solid #e0e0e6;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  z-index: 10;
}

/* Multiple condition selector */
.multiple-condition-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mode-select {
  max-width: 300px;
}

.count-selector {
  margin-top: 8px;
}

.count-input-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.count-suffix {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

.info-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f6f8fa;
  border-radius: 8px;
  font-size: 14px;
  color: #4a5568;
}

/* Ajuster le contenu du modal pour tenir compte du footer fixe */
.condition-modal-container {
  display: flex;
  height: calc(85vh - 200px); /* Augmenté pour tenir compte du footer */
}

/* Responsive */
@media (max-width: 1200px) {
  .preview-panel {
    display: none;
  }
  
  .modal-main {
    flex: 1;
  }
}

@media (max-width: 640px) {
  .modal-body {
    padding: 20px;
  }
  
  .section-content {
    margin-left: 0;
  }
  
  .condition-types {
    grid-template-columns: 1fr;
  }
}
</style>