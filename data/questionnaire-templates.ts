import type { Node, Edge } from '@vue-flow/core'

export interface QuestionnaireTemplate {
  id: string
  name: string
  description: string
  icon: string
  nodes: Node[]
  edges: Edge[]
}

export const emotionalLiberationTemplate: QuestionnaireTemplate = {
  id: 'emotional-liberation',
  name: 'Libération émotionnelle',
  description: 'Un questionnaire guidé pour identifier et libérer les blocages émotionnels',
  icon: 'mdi:heart-pulse',
  nodes: [
    { 
      id: 'start', 
      type: 'trigger', 
      position: { x: 0, y: 0 }, 
      data: { 
        step: '1', 
        name: 'Démarrer', 
        label: 'Début du questionnaire de libération'
      } 
    },
    {
      id: 'q1',
      type: 'question',
      position: { x: 0, y: 100 },
      data: {
        step: '2',
        label: 'Identification du besoin',
        question: 'Quel est ton besoin à libérer, à nettoyer ?',
        questionType: 'checkbox',
        options: [
          'Jalousie', 'Peurs', 'Angoisses', 'Tristesse', 
          'Manque de confiance en moi', 'Manque d\'estime de moi', 
          'Culpabilités', 'Ruptures', 'Hontes', 'Dépendances'
        ],
        required: true
      }
    },
    {
      id: 'q2',
      type: 'question',
      position: { x: 0, y: 200 },
      data: {
        step: '3',
        label: 'Origine temporelle',
        question: 'Depuis quand as-tu ce comportement, cette sensation ?',
        questionType: 'radio',
        options: ['Depuis toujours', 'Depuis l\'enfance', 'Depuis un choc/événement précis'],
        required: true
      }
    },
    {
      id: 'q3',
      type: 'question',
      position: { x: 0, y: 300 },
      data: {
        step: '4',
        label: 'Identification familiale',
        question: 'Qui de ta famille est comme toi ou possède le même comportement ?',
        questionType: 'checkbox',
        options: ['Maman', 'Papa', 'Mamie', 'Papi', 'Frère', 'Soeur', 'Autre'],
        required: true
      }
    },
    {
      id: 'condition1',
      type: 'condition',
      position: { x: 0, y: 400 },
      data: {
        step: '5',
        label: 'Redirection audio',
        conditionType: 'single',
        description: 'Redirige vers l\'audio de méditation correspondant',
        branches: [
          { id: 'branch-maman', label: 'Maman', condition: 'response.includes("Maman")' },
          { id: 'branch-papa', label: 'Papa', condition: 'response.includes("Papa")' },
          { id: 'branch-autres', label: 'Autres', condition: 'true' }
        ]
      }
    },
    {
      id: 'audio-maman',
      type: 'audio',
      position: { x: -200, y: 500 },
      data: {
        step: '6a',
        label: 'Méditation Maman',
        audioTitle: 'Libération - Lien maternel',
        audioUrl: '/audio/liberation-maman.mp3',
        duration: '8:30',
        autoPlay: true
      }
    },
    {
      id: 'audio-papa',
      type: 'audio',
      position: { x: 0, y: 500 },
      data: {
        step: '6b',
        label: 'Méditation Papa',
        audioTitle: 'Libération - Lien paternel',
        audioUrl: '/audio/liberation-papa.mp3',
        duration: '8:30',
        autoPlay: true
      }
    },
    {
      id: 'audio-autres',
      type: 'audio',
      position: { x: 200, y: 500 },
      data: {
        step: '6c',
        label: 'Méditation Générale',
        audioTitle: 'Libération - Liens familiaux',
        audioUrl: '/audio/liberation-general.mp3',
        duration: '10:00',
        autoPlay: true
      }
    },
    { 
      id: 'end', 
      type: 'end', 
      position: { x: 0, y: 600 }, 
      data: { 
        step: '7', 
        name: 'Fin',
        label: 'Fin du questionnaire',
        message: 'Merci d\'avoir complété ce questionnaire de libération émotionnelle. Prenez le temps d\'intégrer cette expérience.'
      } 
    }
  ],
  edges: [
    { id: 'e-start-q1', source: 'start', target: 'q1', type: 'add-node' },
    { id: 'e-q1-q2', source: 'q1', target: 'q2', type: 'add-node' },
    { id: 'e-q2-q3', source: 'q2', target: 'q3', type: 'add-node' },
    { id: 'e-q3-condition', source: 'q3', target: 'condition1', type: 'add-node' },
    { id: 'e-condition-maman', source: 'condition1', sourceHandle: 'branch-maman', target: 'audio-maman', type: 'simple-condition', label: 'Maman' },
    { id: 'e-condition-papa', source: 'condition1', sourceHandle: 'branch-papa', target: 'audio-papa', type: 'simple-condition', label: 'Papa' },
    { id: 'e-condition-autres', source: 'condition1', sourceHandle: 'branch-autres', target: 'audio-autres', type: 'simple-condition', label: 'Autres' },
    { id: 'e-audio-maman-end', source: 'audio-maman', target: 'end', type: 'add-node' },
    { id: 'e-audio-papa-end', source: 'audio-papa', target: 'end', type: 'add-node' },
    { id: 'e-audio-autres-end', source: 'audio-autres', target: 'end', type: 'add-node' }
  ]
}

export const satisfactionClientTemplate: QuestionnaireTemplate = {
  id: 'satisfaction-client',
  name: 'Satisfaction client',
  description: 'Évaluez la satisfaction de vos clients avec des questions ciblées',
  icon: 'mdi:emoticon-happy',
  nodes: [
    { 
      id: 'start', 
      type: 'trigger', 
      position: { x: 0, y: 0 }, 
      data: { 
        step: '1', 
        name: 'Démarrer', 
        label: 'Enquête de satisfaction'
      } 
    },
    {
      id: 'q1',
      type: 'question',
      position: { x: 0, y: 100 },
      data: {
        step: '2',
        label: 'Satisfaction globale',
        question: 'Comment évaluez-vous votre satisfaction globale avec notre service ?',
        questionType: 'radio',
        options: ['Très satisfait', 'Satisfait', 'Neutre', 'Insatisfait', 'Très insatisfait'],
        required: true
      }
    },
    {
      id: 'condition1',
      type: 'condition',
      position: { x: 0, y: 200 },
      data: {
        step: '3',
        label: 'Vérifier satisfaction',
        conditionType: 'single',
        description: 'Adapter les questions selon la satisfaction',
        branches: [
          { id: 'branch-satisfied', label: 'Satisfait', condition: 'response === "Très satisfait" || response === "Satisfait"' },
          { id: 'branch-unsatisfied', label: 'Insatisfait', condition: 'response === "Insatisfait" || response === "Très insatisfait"' }
        ]
      }
    },
    {
      id: 'q2-satisfied',
      type: 'question',
      position: { x: -150, y: 300 },
      data: {
        step: '4a',
        label: 'Points forts',
        question: 'Qu\'est-ce que vous appréciez le plus dans notre service ?',
        questionType: 'textarea',
        required: false
      }
    },
    {
      id: 'q2-unsatisfied',
      type: 'question',
      position: { x: 150, y: 300 },
      data: {
        step: '4b',
        label: 'Points d\'amélioration',
        question: 'Qu\'est-ce qui pourrait être amélioré dans notre service ?',
        questionType: 'textarea',
        required: true
      }
    },
    {
      id: 'q3',
      type: 'question',
      position: { x: 0, y: 400 },
      data: {
        step: '5',
        label: 'Recommandation',
        question: 'Recommanderiez-vous notre service à un ami ou collègue ?',
        questionType: 'radio',
        options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        required: true
      }
    },
    { 
      id: 'end', 
      type: 'end', 
      position: { x: 0, y: 500 }, 
      data: { 
        step: '6', 
        name: 'Fin',
        label: 'Merci !',
        message: 'Merci pour vos retours précieux. Nous les utiliserons pour améliorer notre service.'
      } 
    }
  ],
  edges: [
    { id: 'e-start-q1', source: 'start', target: 'q1', type: 'add-node' },
    { id: 'e-q1-condition', source: 'q1', target: 'condition1', type: 'add-node' },
    { id: 'e-condition-satisfied', source: 'condition1', sourceHandle: 'branch-satisfied', target: 'q2-satisfied', type: 'simple-condition', label: 'Satisfait' },
    { id: 'e-condition-unsatisfied', source: 'condition1', sourceHandle: 'branch-unsatisfied', target: 'q2-unsatisfied', type: 'simple-condition', label: 'Insatisfait' },
    { id: 'e-q2s-q3', source: 'q2-satisfied', target: 'q3', type: 'add-node' },
    { id: 'e-q2u-q3', source: 'q2-unsatisfied', target: 'q3', type: 'add-node' },
    { id: 'e-q3-end', source: 'q3', target: 'end', type: 'add-node' }
  ]
}

export const templates: QuestionnaireTemplate[] = [
  emotionalLiberationTemplate,
  satisfactionClientTemplate
]

export function getTemplateById(id: string): QuestionnaireTemplate | undefined {
  return templates.find(t => t.id === id)
}