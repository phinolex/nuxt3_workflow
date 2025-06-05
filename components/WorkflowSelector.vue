<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="modal-container">
          <div class="modal-header">
            <div class="header-gradient">
              <Icon icon="mdi:book-open-variant" class="header-icon" />
            </div>
            <div class="header-content">
              <h2>Mes questionnaires</h2>
              <p class="header-subtitle">Sélectionnez un questionnaire ou créez-en un nouveau</p>
            </div>
            <button @click="$emit('update:modelValue', false)" class="close-button">
              <Icon icon="mdi:close" />
            </button>
          </div>
          
          <div class="modal-content">
            <!-- Barre de recherche -->
            <div class="search-bar">
              <Icon icon="mdi:magnify" class="search-icon" />
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Rechercher un questionnaire..."
                class="search-input"
              />
            </div>
            
            <!-- Filtres -->
            <div class="filters">
              <button 
                v-for="filter in filters" 
                :key="filter.value"
                @click="activeFilter = filter.value"
                :class="['filter-chip', { active: activeFilter === filter.value }]"
              >
                <Icon :icon="filter.icon" />
                {{ filter.label }}
              </button>
            </div>
            
            <!-- Liste des workflows -->
            <div class="workflows-grid">
              <div
                v-for="workflow in filteredWorkflows"
                :key="workflow.id"
                @click="selectWorkflow(workflow)"
                class="workflow-card"
              >
                <div class="workflow-icon">
                  <Icon :icon="getWorkflowIcon(workflow)" :width="24" />
                </div>
                
                <div class="workflow-info">
                  <h3>
                    {{ workflow.metadata?.name || 'Sans titre' }}
                    <span v-if="workflow.metadata?.isCurrent" class="current-badge">En cours</span>
                  </h3>
                  <p class="workflow-description">
                    {{ getWorkflowDescription(workflow) }}
                  </p>
                  
                  <div class="workflow-stats">
                    <span class="stat">
                      <Icon icon="mdi:help-circle" />
                      {{ workflow.nodes?.filter(n => n.type === 'question').length || 0 }} questions
                    </span>
                    <span class="stat">
                      <Icon icon="mdi:clock-outline" />
                      {{ formatDate(workflow.metadata?.lastModified) }}
                    </span>
                  </div>
                </div>
                
                <div class="workflow-actions">
                  <button @click.stop="previewWorkflow(workflow)" class="action-button preview">
                    <Icon icon="mdi:eye" />
                  </button>
                  <button @click.stop="deleteWorkflow(workflow)" class="action-button delete">
                    <Icon icon="mdi:delete" />
                  </button>
                </div>
              </div>
              
              <!-- État vide -->
              <div v-if="filteredWorkflows.length === 0" class="empty-state">
                <div class="empty-icon">
                  <Icon icon="mdi:folder-open-outline" :width="48" />
                </div>
                <h3>Aucun questionnaire trouvé</h3>
                <p>{{ searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Créez votre premier questionnaire pour commencer' }}</p>
                <button @click="$emit('create-new')" class="create-button">
                  <Icon icon="mdi:plus" />
                  Créer un nouveau questionnaire
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- Modal de confirmation de suppression -->
    <Transition name="modal">
      <div v-if="showDeleteConfirm" class="delete-modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="delete-modal">
          <div class="delete-modal-icon">
            <Icon icon="mdi:delete-alert" :width="48" />
          </div>
          
          <h3 class="delete-modal-title">Supprimer ce questionnaire ?</h3>
          
          <p class="delete-modal-message">
            Êtes-vous sûr de vouloir supprimer <strong>{{ workflowToDelete?.metadata?.name || 'ce questionnaire' }}</strong> ?
            Cette action est irréversible.
          </p>
          
          <div class="delete-modal-actions">
            <button @click="showDeleteConfirm = false" class="delete-modal-cancel">
              Annuler
            </button>
            <button @click="confirmDelete" class="delete-modal-confirm">
              <Icon icon="mdi:delete" />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useMessage } from 'naive-ui'

const message = useMessage()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'select': [workflow: any]
  'create-new': []
}>()

// États
const workflows = ref<any[]>([])
const searchQuery = ref('')
const activeFilter = ref('all')
const showDeleteConfirm = ref(false)
const workflowToDelete = ref<any>(null)

const filters = [
  { value: 'all', label: 'Tous', icon: 'mdi:all-inclusive' },
  { value: 'recent', label: 'Récents', icon: 'mdi:clock-outline' },
  { value: 'favorites', label: 'Favoris', icon: 'mdi:star' },
  { value: 'shared', label: 'Partagés', icon: 'mdi:share-variant' }
]

// Computed
const filteredWorkflows = computed(() => {
  let filtered = workflows.value
  
  // Filtre par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(w => 
      w.metadata?.name?.toLowerCase().includes(query) ||
      w.metadata?.description?.toLowerCase().includes(query)
    )
  }
  
  // Filtre par catégorie
  switch (activeFilter.value) {
    case 'recent':
      // Trier par date de modification
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.metadata?.lastModified || 0).getTime()
        const dateB = new Date(b.metadata?.lastModified || 0).getTime()
        return dateB - dateA
      }).slice(0, 10)
      break
    case 'favorites':
      filtered = filtered.filter(w => w.metadata?.isFavorite)
      break
    case 'shared':
      filtered = filtered.filter(w => w.metadata?.isShared)
      break
  }
  
  return filtered
})

// Méthodes
const loadWorkflows = () => {
  // Charger tous les workflows depuis localStorage
  const savedWorkflows = []
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('workflow_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        savedWorkflows.push({
          id: key,
          ...data
        })
      } catch (error) {
        console.error('Erreur lors du chargement du workflow:', key)
      }
    }
  }
  
  // Ne pas ajouter currentQuestionnaire s'il est déjà dans la liste
  const currentWorkflow = localStorage.getItem('currentQuestionnaire')
  if (currentWorkflow) {
    try {
      const data = JSON.parse(currentWorkflow)
      const currentId = data.metadata?.id
      
      // Vérifier si ce workflow n'est pas déjà dans la liste
      const alreadyExists = savedWorkflows.some(w => w.id === currentId)
      
      if (!alreadyExists && currentId) {
        // C'est un workflow qui n'a pas encore été sauvegardé avec un ID
        savedWorkflows.push({
          id: currentId,
          ...data,
          metadata: {
            ...data.metadata,
            isCurrent: true
          }
        })
      } else if (alreadyExists) {
        // Marquer le workflow existant comme étant le courant
        const index = savedWorkflows.findIndex(w => w.id === currentId)
        if (index !== -1) {
          savedWorkflows[index].metadata = {
            ...savedWorkflows[index].metadata,
            isCurrent: true
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du questionnaire actuel')
    }
  }
  
  workflows.value = savedWorkflows
}

const selectWorkflow = (workflow: any) => {
  emit('select', workflow)
  emit('update:modelValue', false)
}

const previewWorkflow = (workflow: any) => {
  // Ouvrir dans un nouvel onglet avec l'ID du workflow
  localStorage.setItem('previewWorkflow', JSON.stringify(workflow))
  window.open(`/questionnaire-preview?id=${workflow.id}`, '_blank')
}

const deleteWorkflow = (workflow: any) => {
  workflowToDelete.value = workflow
  showDeleteConfirm.value = true
}

const confirmDelete = () => {
  if (!workflowToDelete.value) return
  
  const id = workflowToDelete.value.id
  
  // Supprimer le workflow par son ID
  localStorage.removeItem(id)
  
  // Si c'est le questionnaire actuel, le supprimer aussi
  const currentWorkflow = localStorage.getItem('currentQuestionnaire')
  if (currentWorkflow) {
    try {
      const data = JSON.parse(currentWorkflow)
      if (data.metadata?.id === id) {
        localStorage.removeItem('currentQuestionnaire')
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du questionnaire actuel')
    }
  }
  
  loadWorkflows()
  message.success('Questionnaire supprimé avec succès')
  showDeleteConfirm.value = false
  workflowToDelete.value = null
}

const getWorkflowIcon = (workflow: any) => {
  // Déterminer l'icône basée sur le contenu
  const hasAudio = workflow.nodes?.some((n: any) => n.type === 'audio')
  const hasCondition = workflow.nodes?.some((n: any) => n.type === 'condition')
  
  if (hasAudio) return 'mdi:microphone'
  if (hasCondition) return 'mdi:source-branch'
  return 'mdi:help-circle'
}

const getWorkflowDescription = (workflow: any) => {
  const questionCount = workflow.nodes?.filter((n: any) => n.type === 'question').length || 0
  const conditionCount = workflow.nodes?.filter((n: any) => n.type === 'condition').length || 0
  const audioCount = workflow.nodes?.filter((n: any) => n.type === 'audio').length || 0
  
  const parts = []
  if (questionCount > 0) parts.push(`${questionCount} questions`)
  if (conditionCount > 0) parts.push(`${conditionCount} conditions`)
  if (audioCount > 0) parts.push(`${audioCount} audios`)
  
  return parts.join(' • ') || 'Questionnaire vide'
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Date inconnue'
  
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // Si moins de 24h
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    if (hours === 0) return 'Il y a moins d\'une heure'
    return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`
  }
  
  // Si moins de 7 jours
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`
  }
  
  // Sinon afficher la date
  return date.toLocaleDateString('fr-FR')
}

// Lifecycle
onMounted(() => {
  loadWorkflows()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 16px;
  max-width: 1000px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 0;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-gradient {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  margin: 24px;
}

.header-icon {
  font-size: 40px;
}

.header-content {
  flex: 1;
  padding: 24px 0;
}

.modal-header h2 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
}

.header-subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.modal-content {
  padding: 32px;
  overflow-y: auto;
  flex: 1;
}

/* Barre de recherche */
.search-bar {
  position: relative;
  margin-bottom: 24px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 20px;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Filtres */
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 8px 16px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-chip:hover {
  border-color: #667eea;
  color: #667eea;
}

.filter-chip.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

/* Grille de workflows */
.workflows-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.workflow-card {
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  gap: 16px;
  position: relative;
}

.workflow-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
}

.workflow-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.workflow-info {
  flex: 1;
  min-width: 0;
}

.workflow-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-badge {
  font-size: 12px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.workflow-description {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
}

.workflow-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #9ca3af;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.workflow-actions {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.workflow-card:hover .workflow-actions {
  opacity: 1;
}

.action-button {
  padding: 8px;
  border: none;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.action-button.preview {
  color: #667eea;
}

.action-button.delete {
  color: #ef4444;
}

/* État vide */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  color: #e5e7eb;
  margin-bottom: 24px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #374151;
}

.empty-state p {
  margin: 0 0 32px 0;
  font-size: 16px;
  color: #6b7280;
}

.create-button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.create-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}

/* Modal de suppression */
.delete-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.delete-modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  text-align: center;
  position: relative;
  animation: modalBounce 0.3s ease-out;
}

@keyframes modalBounce {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.delete-modal-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);
}

.delete-modal-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.delete-modal-message {
  font-size: 16px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 32px 0;
}

.delete-modal-message strong {
  color: #374151;
  font-weight: 600;
}

.delete-modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.delete-modal-cancel,
.delete-modal-confirm {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-modal-cancel {
  background: #f3f4f6;
  color: #374151;
}

.delete-modal-cancel:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.delete-modal-confirm {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);
}

.delete-modal-confirm:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);
}

.delete-modal-confirm:active {
  transform: translateY(0);
}
</style>