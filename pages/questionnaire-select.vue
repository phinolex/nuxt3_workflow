<template>
  <div class="select-container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="logo">
          <Icon icon="mdi:book-open-variant" :width="32" />
          <h1>Mes Questionnaires</h1>
        </div>
        <button @click="createNew" class="create-button">
          <Icon icon="mdi:plus" />
          Nouveau questionnaire
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Barre de recherche et filtres -->
      <div class="controls">
        <div class="search-bar">
          <Icon icon="mdi:magnify" class="search-icon" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Rechercher un questionnaire..."
            class="search-input"
          />
        </div>
        
        <div class="view-controls">
          <button 
            @click="viewMode = 'grid'"
            :class="['view-button', { active: viewMode === 'grid' }]"
          >
            <Icon icon="mdi:view-grid" />
          </button>
          <button 
            @click="viewMode = 'list'"
            :class="['view-button', { active: viewMode === 'list' }]"
          >
            <Icon icon="mdi:view-list" />
          </button>
        </div>
      </div>

      <!-- Liste des questionnaires -->
      <div :class="['workflows-container', viewMode]">
        <div
          v-for="workflow in filteredWorkflows"
          :key="workflow.id"
          @click="openWorkflow(workflow)"
          class="workflow-item"
        >
          <div class="workflow-icon">
            <Icon :icon="getWorkflowIcon(workflow)" :width="24" />
          </div>
          
          <div class="workflow-content">
            <h3>{{ workflow.metadata?.name || 'Sans titre' }}</h3>
            <p class="workflow-info">
              {{ getWorkflowDescription(workflow) }}
            </p>
            
            <div class="workflow-meta">
              <span class="date">
                <Icon icon="mdi:calendar" />
                {{ formatDate(workflow.metadata?.lastModified) }}
              </span>
              <span class="version">
                v{{ workflow.metadata?.version || '1.0' }}
              </span>
            </div>
          </div>
          
          <div class="workflow-actions">
            <button 
              @click.stop="editWorkflow(workflow)" 
              class="action-button"
              title="Modifier"
            >
              <Icon icon="mdi:pencil" />
            </button>
            <button 
              @click.stop="duplicateWorkflow(workflow)" 
              class="action-button"
              title="Dupliquer"
            >
              <Icon icon="mdi:content-copy" />
            </button>
            <button 
              @click.stop="exportWorkflow(workflow)" 
              class="action-button"
              title="Exporter"
            >
              <Icon icon="mdi:download" />
            </button>
            <button 
              @click.stop="deleteWorkflow(workflow)" 
              class="action-button danger"
              title="Supprimer"
            >
              <Icon icon="mdi:delete" />
            </button>
          </div>
        </div>

        <!-- État vide -->
        <div v-if="filteredWorkflows.length === 0" class="empty-state">
          <div class="empty-icon">
            <Icon icon="mdi:folder-open-outline" :width="64" />
          </div>
          <h2>Aucun questionnaire trouvé</h2>
          <p>Créez votre premier questionnaire pour commencer</p>
          <button @click="createNew" class="primary-button">
            <Icon icon="mdi:plus" />
            Créer un questionnaire
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { NButton, useMessage } from 'naive-ui'

// États
const workflows = ref<any[]>([])
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')

// Computed
const filteredWorkflows = computed(() => {
  if (!searchQuery.value) return workflows.value
  
  const query = searchQuery.value.toLowerCase()
  return workflows.value.filter(w => 
    w.metadata?.name?.toLowerCase().includes(query) ||
    getWorkflowDescription(w).toLowerCase().includes(query)
  )
})

// Méthodes
const loadWorkflows = () => {
  const savedWorkflows = []
  
  // Charger tous les workflows depuis localStorage
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
  
  // Trier par date de modification (plus récent en premier)
  workflows.value = savedWorkflows.sort((a, b) => {
    const dateA = new Date(a.metadata?.lastModified || 0).getTime()
    const dateB = new Date(b.metadata?.lastModified || 0).getTime()
    return dateB - dateA
  })
}

const createNew = () => {
  window.location.href = '/questionnaire-builder'
}

const openWorkflow = (workflow: any) => {
  // Sauvegarder le workflow comme questionnaire actuel
  localStorage.setItem('currentQuestionnaire', JSON.stringify(workflow))
  // Ouvrir en preview
  window.location.href = '/questionnaire-preview'
}

const editWorkflow = (workflow: any) => {
  // Charger le workflow dans l'éditeur
  localStorage.setItem('workflowToEdit', JSON.stringify(workflow))
  window.location.href = '/questionnaire-builder?edit=' + workflow.id
}

const duplicateWorkflow = (workflow: any) => {
  const newId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const duplicate = {
    ...workflow,
    id: newId,
    metadata: {
      ...workflow.metadata,
      name: `${workflow.metadata?.name || 'Sans titre'} (copie)`,
      id: newId,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }
  }
  
  localStorage.setItem(newId, JSON.stringify(duplicate))
  loadWorkflows()
  message.success('Questionnaire dupliqué')
}

const exportWorkflow = (workflow: any) => {
  const json = JSON.stringify(workflow, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${workflow.metadata?.name?.toLowerCase().replace(/\s+/g, '-') || 'questionnaire'}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  message.success('Questionnaire exporté')
}

const deleteWorkflow = (workflow: any) => {
  if (confirm(`Êtes-vous sûr de vouloir supprimer "${workflow.metadata?.name || 'ce questionnaire'}" ?`)) {
    localStorage.removeItem(workflow.id)
    loadWorkflows()
    message.success('Questionnaire supprimé')
  }
}

const getWorkflowIcon = (workflow: any) => {
  const hasAudio = workflow.nodes?.some((n: any) => n.type === 'audio')
  const hasCondition = workflow.nodes?.some((n: any) => n.type === 'condition')
  
  if (hasAudio) return 'mdi:microphone'
  if (hasCondition) return 'mdi:source-branch'
  return 'mdi:help-circle'
}

const getWorkflowDescription = (workflow: any) => {
  const questions = workflow.nodes?.filter((n: any) => n.type === 'question').length || 0
  const conditions = workflow.nodes?.filter((n: any) => n.type === 'condition').length || 0
  const audios = workflow.nodes?.filter((n: any) => n.type === 'audio').length || 0
  
  const parts = []
  if (questions > 0) parts.push(`${questions} question${questions > 1 ? 's' : ''}`)
  if (conditions > 0) parts.push(`${conditions} condition${conditions > 1 ? 's' : ''}`)
  if (audios > 0) parts.push(`${audios} audio${audios > 1 ? 's' : ''}`)
  
  return parts.join(' • ') || 'Questionnaire vide'
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Date inconnue'
  
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    if (minutes === 0) return 'À l\'instant'
    return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`
  }
  
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`
  }
  
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

// Lifecycle
onMounted(() => {
  loadWorkflows()
})
</script>

<style scoped>
.select-container {
  min-height: 100vh;
  background: #f8fafc;
}

/* Header */
.header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #667eea;
}

.logo h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.create-button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.create-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Content */
.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Controls */
.controls {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  align-items: center;
}

.search-bar {
  flex: 1;
  position: relative;
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
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.view-controls {
  display: flex;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

.view-button {
  padding: 10px 14px;
  border: none;
  background: none;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.view-button:hover {
  background: #f3f4f6;
}

.view-button.active {
  background: #667eea;
  color: white;
}

/* Workflows container */
.workflows-container {
  display: grid;
  gap: 16px;
}

.workflows-container.grid {
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
}

.workflows-container.list {
  grid-template-columns: 1fr;
}

/* Workflow item */
.workflow-item {
  background: white;
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

.workflow-item:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
}

.workflow-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.workflow-content {
  flex: 1;
  min-width: 0;
}

.workflow-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-info {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #6b7280;
}

.workflow-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #9ca3af;
}

.date {
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

.workflow-item:hover .workflow-actions {
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
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.action-button:hover {
  color: #667eea;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.action-button.danger:hover {
  color: #ef4444;
}

/* Empty state */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  color: #e5e7eb;
  margin-bottom: 24px;
}

.empty-state h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #374151;
}

.empty-state p {
  margin: 0 0 32px 0;
  font-size: 16px;
  color: #6b7280;
}

.primary-button {
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

.primary-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .workflows-container.grid {
    grid-template-columns: 1fr;
  }
  
  .controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .workflow-actions {
    opacity: 1;
    position: static;
    margin-top: 16px;
  }
}
</style>