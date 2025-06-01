<template>
  <n-modal
    v-model:show="show"
    preset="card"
    :title="isEdit ? 'Modifier l\'audio' : 'Ajouter un audio'"
    style="width: 500px"
    :bordered="false"
    :segmented="{
      content: true,
      footer: true
    }"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="top"
    >
      <n-form-item label="Titre du bloc" path="label">
        <n-input
          v-model:value="formData.label"
          placeholder="Ex: Audio Maman"
        />
      </n-form-item>

      <n-form-item label="Titre de l'audio" path="audioTitle">
        <n-input
          v-model:value="formData.audioTitle"
          placeholder="Ex: Méditation guidée"
        />
      </n-form-item>

      <n-form-item label="URL de l'audio" path="audioUrl">
        <n-input
          v-model:value="formData.audioUrl"
          placeholder="https://example.com/audio.mp3"
        />
      </n-form-item>

      <n-form-item label="Durée (optionnel)">
        <n-input
          v-model:value="formData.duration"
          placeholder="Ex: 5:30"
        />
      </n-form-item>

      <n-form-item label="Description (optionnel)">
        <n-input
          v-model:value="formData.description"
          type="textarea"
          placeholder="Description de l'audio..."
          :rows="3"
        />
      </n-form-item>

      <n-form-item label="Options">
        <n-space vertical>
          <n-checkbox v-model:checked="formData.autoPlay">
            Lecture automatique
          </n-checkbox>
          <n-checkbox v-model:checked="formData.showControls">
            Afficher les contrôles
          </n-checkbox>
        </n-space>
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="show = false">
          Annuler
        </n-button>
        <n-button type="primary" @click="handleSubmit">
          {{ isEdit ? 'Modifier' : 'Ajouter' }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NSpace,
  NCheckbox,
  FormInst,
  FormRules
} from 'naive-ui'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  nodeData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const show = ref(false)
const formRef = ref<FormInst | null>(null)
const isEdit = ref(false)

const defaultFormData = {
  label: '',
  audioTitle: '',
  audioUrl: '',
  duration: '',
  description: '',
  autoPlay: false,
  showControls: true
}

const formData = reactive({ ...defaultFormData })

const rules: FormRules = {
  label: {
    required: true,
    message: 'Le titre est requis',
    trigger: 'blur'
  },
  audioTitle: {
    required: true,
    message: 'Le titre de l\'audio est requis',
    trigger: 'blur'
  },
  audioUrl: {
    required: true,
    message: 'L\'URL de l\'audio est requise',
    trigger: 'blur',
    validator(rule, value) {
      if (!value) return new Error('L\'URL est requise')
      try {
        new URL(value)
        return true
      } catch {
        return new Error('L\'URL n\'est pas valide')
      }
    }
  }
}

watch(() => props.modelValue, (val) => {
  show.value = val
  if (val) {
    isEdit.value = !!props.nodeData
    if (props.nodeData) {
      Object.assign(formData, {
        ...defaultFormData,
        ...props.nodeData
      })
    } else {
      Object.assign(formData, defaultFormData)
    }
  }
})

watch(show, (val) => {
  emit('update:modelValue', val)
})

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    emit('confirm', { ...formData })
    show.value = false
  } catch (error) {
    console.error('Validation failed:', error)
  }
}
</script>