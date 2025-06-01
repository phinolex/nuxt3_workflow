<template>
  <n-modal
    v-model:show="show"
    preset="card"
    :title="isEdit ? 'Modifier la question' : 'Ajouter une question'"
    style="width: 600px"
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
          placeholder="Ex: Question 1"
        />
      </n-form-item>

      <n-form-item label="Question" path="question">
        <n-input
          v-model:value="formData.question"
          type="textarea"
          placeholder="Entrez votre question ici..."
          :rows="3"
        />
      </n-form-item>

      <n-form-item label="Type de question" path="questionType">
        <n-select
          v-model:value="formData.questionType"
          :options="questionTypeOptions"
          placeholder="Sélectionnez un type"
        />
      </n-form-item>

      <n-form-item 
        v-if="formData.questionType === 'checkbox' || formData.questionType === 'radio'"
        label="Options de réponse"
        path="options"
      >
        <n-dynamic-input
          v-model:value="formData.options"
          :on-create="() => ''"
          placeholder="Entrez une option"
          :min="2"
        >
          <template #create-button-default>
            Ajouter une option
          </template>
        </n-dynamic-input>
      </n-form-item>

      <n-form-item 
        v-if="formData.questionType === 'scale'"
        label="Configuration de l'échelle"
      >
        <n-space vertical style="width: 100%">
          <n-input-group>
            <n-input-group-label>Min</n-input-group-label>
            <n-input-number
              v-model:value="formData.scaleMin"
              :min="0"
              style="width: 100px"
            />
          </n-input-group>
          <n-input-group>
            <n-input-group-label>Max</n-input-group-label>
            <n-input-number
              v-model:value="formData.scaleMax"
              :min="formData.scaleMin || 1"
              style="width: 100px"
            />
          </n-input-group>
        </n-space>
      </n-form-item>

      <n-form-item label="Validation">
        <n-checkbox v-model:checked="formData.required">
          Réponse obligatoire
        </n-checkbox>
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
  NSelect,
  NButton,
  NSpace,
  NDynamicInput,
  NCheckbox,
  NInputNumber,
  NInputGroup,
  NInputGroupLabel,
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
  question: '',
  questionType: 'checkbox',
  options: ['', ''],
  required: true,
  scaleMin: 1,
  scaleMax: 5
}

const formData = reactive({ ...defaultFormData })

const questionTypeOptions = [
  { label: 'Choix multiple (checkbox)', value: 'checkbox' },
  { label: 'Choix unique (radio)', value: 'radio' },
  { label: 'Texte libre', value: 'text' },
  { label: 'Nombre', value: 'number' },
  { label: 'Échelle', value: 'scale' }
]

const rules: FormRules = {
  label: {
    required: true,
    message: 'Le titre est requis',
    trigger: 'blur'
  },
  question: {
    required: true,
    message: 'La question est requise',
    trigger: 'blur'
  },
  questionType: {
    required: true,
    message: 'Le type de question est requis'
  },
  options: {
    type: 'array',
    required: true,
    trigger: 'change',
    validator(rule, value) {
      if (formData.questionType !== 'checkbox' && formData.questionType !== 'radio') {
        return true
      }
      if (!value || value.length < 2) {
        return new Error('Au moins 2 options sont requises')
      }
      if (value.some((opt: string) => !opt.trim())) {
        return new Error('Les options ne peuvent pas être vides')
      }
      return true
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
    
    const data = {
      label: formData.label,
      question: formData.question,
      questionType: formData.questionType,
      required: formData.required
    }

    if (formData.questionType === 'checkbox' || formData.questionType === 'radio') {
      data.options = formData.options.filter(opt => opt.trim())
    }

    if (formData.questionType === 'scale') {
      data.scaleMin = formData.scaleMin
      data.scaleMax = formData.scaleMax
    }

    emit('confirm', data)
    show.value = false
  } catch (error) {
    console.error('Validation failed:', error)
  }
}
</script>