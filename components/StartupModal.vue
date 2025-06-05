<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="modal-container">
          <div class="modal-header">
            <Icon icon="mdi:book-open-variant" class="header-icon" />
            <h2>Bienvenue dans le créateur de questionnaire</h2>
            <p class="subtitle">Choisissez comment commencer votre projet</p>
          </div>
          
          <div class="modal-content">
            <div class="option-cards">
              <!-- Création vierge -->
              <div class="option-card" @click="handleNewProject">
                <div class="card-icon new">
                  <Icon icon="mdi:file-plus" :width="32" :height="32" />
                </div>
                <h3>Création vierge</h3>
                <p>Commencez avec un questionnaire vide et construisez votre flow de zéro.</p>
                <div class="card-action">
                  <span>Commencer</span>
                  <Icon icon="mdi:arrow-right" />
                </div>
              </div>
              
              <!-- Templates -->
              <div class="option-card" @click="showTemplates = true">
                <div class="card-icon template">
                  <Icon icon="mdi:folder-star" :width="32" :height="32" />
                </div>
                <h3>Questionnaire pré-créé</h3>
                <p>Utilisez un modèle existant comme point de départ pour votre questionnaire.</p>
                <div class="card-action">
                  <span>Parcourir</span>
                  <Icon icon="mdi:arrow-right" />
                </div>
              </div>
              
              <!-- Charger fichier -->
              <div class="option-card" @click="handleLoadFile">
                <div class="card-icon load">
                  <Icon icon="mdi:upload" :width="32" :height="32" />
                </div>
                <h3>Charger un fichier</h3>
                <p>Importez un questionnaire précédemment sauvegardé depuis votre ordinateur.</p>
                <div class="card-action">
                  <span>Parcourir</span>
                  <Icon icon="mdi:arrow-right" />
                </div>
              </div>
              
              <!-- Mes questionnaires -->
              <div class="option-card" @click="goToQuestionnaireList">
                <div class="card-icon list">
                  <Icon icon="mdi:view-list" :width="32" :height="32" />
                </div>
                <h3>Mes questionnaires</h3>
                <p>Accédez à tous vos questionnaires sauvegardés et gérez-les facilement.</p>
                <div class="card-action">
                  <span>Voir la liste</span>
                  <Icon icon="mdi:arrow-right" />
                </div>
              </div>
            </div>
          </div>
          
          <!-- Templates section -->
          <Transition name="slide">
            <div v-if="showTemplates" class="templates-section">
              <div class="templates-header">
                <button @click="showTemplates = false" class="back-button">
                  <Icon icon="mdi:arrow-left" />
                  Retour
                </button>
                <h3>Questionnaires pré-créés</h3>
              </div>
              
              <div class="templates-grid">
                <div 
                  v-for="template in templates" 
                  :key="template.id"
                  class="template-card"
                  @click="handleSelectTemplate(template)"
                >
                  <div class="template-preview">
                    <Icon :icon="template.icon" :width="24" />
                  </div>
                  <h4>{{ template.name }}</h4>
                  <p>{{ template.description }}</p>
                  <div class="template-stats">
                    <span><Icon icon="mdi:help-circle" /> {{ template.questions }} questions</span>
                    <span><Icon icon="mdi:source-branch" /> {{ template.branches }} branches</span>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'select': [action: { type: 'new' | 'template' | 'load' | 'list', template?: any }]
}>()

const showTemplates = ref(false)

const templates = ref([
  {
    id: 'emotional-liberation',
    name: 'Libération émotionnelle',
    description: 'Un questionnaire guidé pour identifier et libérer les blocages émotionnels',
    icon: 'mdi:heart-pulse',
    questions: 3,
    branches: 3
  },
  {
    id: 'satisfaction-client',
    name: 'Satisfaction client',
    description: 'Évaluez la satisfaction de vos clients avec des questions ciblées',
    icon: 'mdi:emoticon-happy',
    questions: 5,
    branches: 2
  },
  {
    id: 'evaluation-employe',
    name: 'Évaluation employé',
    description: 'Un questionnaire complet pour les évaluations annuelles',
    icon: 'mdi:account-check',
    questions: 8,
    branches: 4
  },
  {
    id: 'sondage-simple',
    name: 'Sondage simple',
    description: 'Un modèle basique pour créer des sondages rapides',
    icon: 'mdi:poll',
    questions: 4,
    branches: 1
  }
])

const handleNewProject = () => {
  emit('select', { type: 'new' })
  emit('update:modelValue', false)
}

const handleLoadFile = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          emit('select', { type: 'load', template: data })
          emit('update:modelValue', false)
        } catch (error) {
          console.error('Erreur lors du chargement du fichier:', error)
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

const handleSelectTemplate = (template: any) => {
  emit('select', { type: 'template', template })
  emit('update:modelValue', false)
}

const goToQuestionnaireList = () => {
  emit('select', { type: 'list' })
  emit('update:modelValue', false)
}
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
  max-width: 70%;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
}

.modal-header {
  padding: 40px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.modal-header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 16px;
}

.modal-content {
  padding: 40px;
}

.option-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.option-card {
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.option-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
}

.card-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: white;
}

.card-icon.new {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.card-icon.template {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.card-icon.load {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
}

.card-icon.list {
  background: linear-gradient(135deg, #fa709a, #fee140);
}

.option-card h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
}

.option-card p {
  margin: 0 0 16px 0;
  color: #718096;
  font-size: 14px;
  line-height: 1.5;
}

.card-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #667eea;
  font-weight: 500;
  font-size: 14px;
}

/* Templates section */
.templates-section {
  position: absolute;
  inset: 0;
  background: white;
  overflow-y: auto;
}

.templates-header {
  padding: 24px 40px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #4a5568;
  transition: all 0.2s;
}

.back-button:hover {
  background: #e2e8f0;
}

.templates-header h3 {
  margin: 0;
  font-size: 20px;
  color: #2d3748;
}

.templates-grid {
  padding: 40px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.template-card {
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.template-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.template-preview {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 16px;
}

.template-card h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
}

.template-card p {
  margin: 0 0 16px 0;
  color: #718096;
  font-size: 14px;
  line-height: 1.4;
}

.template-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #a0aec0;
}

.template-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
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

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(100%);
}
</style>