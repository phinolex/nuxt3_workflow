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
      draggable: false,
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
      draggable: false,
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

export const evaluationEmployeTemplate: QuestionnaireTemplate = {
  id: 'evaluation-employe',
  name: 'Évaluation employé',
  description: 'Un questionnaire complet pour les évaluations annuelles',
  icon: 'mdi:account-check',
  nodes: [
    { 
      id: 'start', 
      type: 'trigger', 
      position: { x: 0, y: 0 }, 
      data: { 
        step: '1', 
        name: 'Démarrer', 
        label: 'Évaluation annuelle de performance'
      } 
    },
    {
      id: 'q1',
      type: 'question',
      position: { x: 0, y: 100 },
      data: {
        step: '2',
        label: 'Auto-évaluation globale',
        question: 'Comment évaluez-vous votre performance globale cette année ?',
        questionType: 'radio',
        options: ['Excellente', 'Très bonne', 'Bonne', 'Satisfaisante', 'À améliorer'],
        required: true
      }
    },
    {
      id: 'q2',
      type: 'question',
      position: { x: 0, y: 200 },
      data: {
        step: '3',
        label: 'Objectifs atteints',
        question: 'Quels objectifs avez-vous atteints cette année ?',
        questionType: 'checkbox',
        options: [
          'Objectifs de vente',
          'Objectifs de qualité',
          'Objectifs de productivité',
          'Objectifs de développement personnel',
          'Objectifs d\'équipe'
        ],
        required: true
      }
    },
    {
      id: 'q3',
      type: 'question',
      position: { x: 0, y: 300 },
      data: {
        step: '4',
        label: 'Réalisations majeures',
        question: 'Décrivez vos 3 principales réalisations cette année',
        questionType: 'textarea',
        required: true
      }
    },
    {
      id: 'q4',
      type: 'question',
      position: { x: 0, y: 400 },
      data: {
        step: '5',
        label: 'Défis rencontrés',
        question: 'Quels ont été vos principaux défis ?',
        questionType: 'textarea',
        required: true
      }
    },
    {
      id: 'condition1',
      type: 'condition',
      position: { x: 0, y: 500 },
      draggable: false,
      data: {
        step: '6',
        label: 'Besoins de formation',
        conditionType: 'single',
        description: 'Identifier les besoins de développement',
        branches: [
          { id: 'branch-formation', label: 'Besoin formation', condition: 'true' },
          { id: 'branch-pas-formation', label: 'Pas de besoin', condition: 'false' }
        ]
      }
    },
    {
      id: 'q5',
      type: 'question',
      position: { x: -150, y: 600 },
      data: {
        step: '7a',
        label: 'Formations souhaitées',
        question: 'Quelles formations souhaiteriez-vous suivre ?',
        questionType: 'checkbox',
        options: [
          'Leadership',
          'Communication',
          'Gestion de projet',
          'Compétences techniques',
          'Langues',
          'Autre'
        ],
        required: false
      }
    },
    {
      id: 'q6',
      type: 'question',
      position: { x: 0, y: 700 },
      data: {
        step: '8',
        label: 'Objectifs futurs',
        question: 'Quels sont vos objectifs pour l\'année prochaine ?',
        questionType: 'textarea',
        required: true
      }
    },
    {
      id: 'q7',
      type: 'question',
      position: { x: 0, y: 800 },
      data: {
        step: '9',
        label: 'Feedback manager',
        question: 'Avez-vous des commentaires pour votre manager ?',
        questionType: 'textarea',
        required: false
      }
    },
    {
      id: 'q8',
      type: 'question',
      position: { x: 0, y: 900 },
      data: {
        step: '10',
        label: 'Satisfaction au travail',
        question: 'Évaluez votre satisfaction au travail',
        questionType: 'radio',
        options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        required: true
      }
    },
    { 
      id: 'end', 
      type: 'end', 
      position: { x: 0, y: 1000 }, 
      data: { 
        step: '11', 
        name: 'Fin',
        label: 'Évaluation terminée',
        message: 'Merci pour votre évaluation. Elle sera transmise à votre manager pour discussion.'
      } 
    }
  ],
  edges: [
    { id: 'e-start-q1', source: 'start', target: 'q1', type: 'add-node' },
    { id: 'e-q1-q2', source: 'q1', target: 'q2', type: 'add-node' },
    { id: 'e-q2-q3', source: 'q2', target: 'q3', type: 'add-node' },
    { id: 'e-q3-q4', source: 'q3', target: 'q4', type: 'add-node' },
    { id: 'e-q4-condition', source: 'q4', target: 'condition1', type: 'add-node' },
    { id: 'e-condition-formation', source: 'condition1', sourceHandle: 'branch-formation', target: 'q5', type: 'simple-condition', label: 'Formation' },
    { id: 'e-condition-pas-formation', source: 'condition1', sourceHandle: 'branch-pas-formation', target: 'q6', type: 'simple-condition', label: 'Direct' },
    { id: 'e-q5-q6', source: 'q5', target: 'q6', type: 'add-node' },
    { id: 'e-q6-q7', source: 'q6', target: 'q7', type: 'add-node' },
    { id: 'e-q7-q8', source: 'q7', target: 'q8', type: 'add-node' },
    { id: 'e-q8-end', source: 'q8', target: 'end', type: 'add-node' }
  ]
}

export const sondageSimpleTemplate: QuestionnaireTemplate = {
  id: 'sondage-simple',
  name: 'Sondage simple',
  description: 'Un modèle basique pour créer des sondages rapides',
  icon: 'mdi:poll',
  nodes: [
    { 
      id: 'start', 
      type: 'trigger', 
      position: { x: 0, y: 0 }, 
      data: { 
        step: '1', 
        name: 'Démarrer', 
        label: 'Sondage rapide'
      } 
    },
    {
      id: 'q1',
      type: 'question',
      position: { x: 0, y: 100 },
      data: {
        step: '2',
        label: 'Question principale',
        question: 'Quelle est votre opinion sur notre nouveau produit ?',
        questionType: 'radio',
        options: ['Très positif', 'Positif', 'Neutre', 'Négatif', 'Très négatif'],
        required: true
      }
    },
    {
      id: 'q2',
      type: 'question',
      position: { x: 0, y: 200 },
      data: {
        step: '3',
        label: 'Fréquence d\'utilisation',
        question: 'À quelle fréquence utilisez-vous notre produit ?',
        questionType: 'radio',
        options: ['Tous les jours', 'Plusieurs fois par semaine', 'Une fois par semaine', 'Rarement', 'Jamais'],
        required: true
      }
    },
    {
      id: 'q3',
      type: 'question',
      position: { x: 0, y: 300 },
      data: {
        step: '4',
        label: 'Suggestions',
        question: 'Avez-vous des suggestions d\'amélioration ?',
        questionType: 'textarea',
        required: false
      }
    },
    {
      id: 'q4',
      type: 'question',
      position: { x: 0, y: 400 },
      data: {
        step: '5',
        label: 'Contact',
        question: 'Souhaitez-vous être recontacté ?',
        questionType: 'radio',
        options: ['Oui', 'Non'],
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
        message: 'Merci pour votre participation à ce sondage.'
      } 
    }
  ],
  edges: [
    { id: 'e-start-q1', source: 'start', target: 'q1', type: 'add-node' },
    { id: 'e-q1-q2', source: 'q1', target: 'q2', type: 'add-node' },
    { id: 'e-q2-q3', source: 'q2', target: 'q3', type: 'add-node' },
    { id: 'e-q3-q4', source: 'q3', target: 'q4', type: 'add-node' },
    { id: 'e-q4-end', source: 'q4', target: 'end', type: 'add-node' }
  ]
}

export const questionnaireComplexeTemplate: QuestionnaireTemplate = {
  id: 'questionnaire-complexe',
  name: 'Diagnostic Entreprise 360°',
  description: 'Analyse complète multi-dimensionnelle avec branchements intelligents et méditations guidées',
  icon: 'mdi:chart-radar',
  nodes: [
    { 
      id: 'start', 
      type: 'trigger', 
      position: { x: 0, y: 0 }, 
      data: { 
        step: '1', 
        name: 'Démarrer', 
        label: 'Diagnostic Entreprise 360°'
      } 
    },
    {
      id: 'q-profile',
      type: 'question',
      position: { x: 0, y: 100 },
      data: {
        step: '2',
        label: 'Profil utilisateur',
        question: 'Quel est votre rôle dans l\'entreprise ?',
        questionType: 'radio',
        options: ['Dirigeant', 'Manager', 'Employé', 'Consultant externe', 'Client', 'Partenaire'],
        required: true
      }
    },
    {
      id: 'condition-profile',
      type: 'condition',
      position: { x: 0, y: 200 },
      draggable: false,
      data: {
        step: '3',
        label: 'Orientation profil',
        conditionType: 'single',
        description: 'Adapter le questionnaire selon le profil',
        branches: [
          { id: 'branch-dirigeant', label: 'Dirigeant', condition: 'response === "Dirigeant"' },
          { id: 'branch-manager', label: 'Manager', condition: 'response === "Manager"' },
          { id: 'branch-employe', label: 'Employé', condition: 'response === "Employé"' },
          { id: 'branch-externe', label: 'Externe', condition: 'response === "Consultant externe" || response === "Client" || response === "Partenaire"' }
        ]
      }
    },
    // Section Dirigeant
    {
      id: 'q-dirigeant-1',
      type: 'question',
      position: { x: -600, y: 300 },
      data: {
        step: '4a',
        label: 'Vision stratégique',
        question: 'Évaluez la clarté de votre vision stratégique à 5 ans',
        questionType: 'radio',
        options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        required: true
      }
    },
    {
      id: 'q-dirigeant-2',
      type: 'question',
      position: { x: -600, y: 400 },
      data: {
        step: '5a',
        label: 'Défis principaux',
        question: 'Quels sont vos 3 défis majeurs actuels ?',
        questionType: 'checkbox',
        options: [
          'Croissance du chiffre d\'affaires',
          'Rentabilité',
          'Innovation produit/service',
          'Transformation digitale',
          'Gestion des talents',
          'Expansion internationale',
          'RSE et développement durable',
          'Gestion de crise'
        ],
        required: true
      }
    },
    {
      id: 'audio-dirigeant',
      type: 'audio',
      position: { x: -600, y: 500 },
      data: {
        step: '6a',
        label: 'Méditation Leadership',
        audioTitle: 'Renforcer votre leadership conscient',
        audioUrl: '/audio/leadership-conscient.mp3',
        duration: '12:00',
        autoPlay: false
      }
    },
    // Section Manager
    {
      id: 'q-manager-1',
      type: 'question',
      position: { x: -200, y: 300 },
      data: {
        step: '4b',
        label: 'Taille équipe',
        question: 'Combien de personnes managez-vous directement ?',
        questionType: 'radio',
        options: ['1-5', '6-10', '11-20', '21-50', 'Plus de 50'],
        required: true
      }
    },
    {
      id: 'q-manager-2',
      type: 'question',
      position: { x: -200, y: 400 },
      data: {
        step: '5b',
        label: 'Défis management',
        question: 'Quels sont vos principaux défis managériaux ?',
        questionType: 'checkbox',
        options: [
          'Motivation de l\'équipe',
          'Communication interne',
          'Gestion des conflits',
          'Développement des compétences',
          'Performance de l\'équipe',
          'Équilibre vie pro/perso',
          'Gestion du changement'
        ],
        required: true
      }
    },
    {
      id: 'condition-manager-stress',
      type: 'condition',
      position: { x: -200, y: 500 },
      draggable: false,
      data: {
        step: '6b',
        label: 'Niveau de stress',
        conditionType: 'single',
        description: 'Évaluer le besoin de support',
        branches: [
          { id: 'branch-stress-high', label: 'Stress élevé', condition: 'responses.includes("Gestion des conflits") || responses.includes("Équilibre vie pro/perso")' },
          { id: 'branch-stress-normal', label: 'Stress normal', condition: 'true' }
        ]
      }
    },
    {
      id: 'audio-manager-stress',
      type: 'audio',
      position: { x: -350, y: 600 },
      data: {
        step: '7b1',
        label: 'Méditation Anti-stress',
        audioTitle: 'Gestion du stress managérial',
        audioUrl: '/audio/stress-manager.mp3',
        duration: '15:00',
        autoPlay: true
      }
    },
    // Section Employé
    {
      id: 'q-employe-1',
      type: 'question',
      position: { x: 200, y: 300 },
      data: {
        step: '4c',
        label: 'Satisfaction poste',
        question: 'Êtes-vous satisfait de votre poste actuel ?',
        questionType: 'radio',
        options: ['Très satisfait', 'Satisfait', 'Moyennement satisfait', 'Peu satisfait', 'Pas du tout satisfait'],
        required: true
      }
    },
    {
      id: 'q-employe-2',
      type: 'question',
      position: { x: 200, y: 400 },
      data: {
        step: '5c',
        label: 'Évolution souhaitée',
        question: 'Comment envisagez-vous votre évolution ?',
        questionType: 'checkbox',
        options: [
          'Monter en compétences techniques',
          'Évoluer vers du management',
          'Changer de service',
          'Développer de nouveaux projets',
          'Formation continue',
          'Mobilité internationale'
        ],
        required: true
      }
    },
    {
      id: 'q-employe-wellbeing',
      type: 'question',
      position: { x: 200, y: 500 },
      data: {
        step: '6c',
        label: 'Bien-être au travail',
        question: 'Évaluez votre bien-être au travail sur différents aspects',
        questionType: 'checkbox',
        options: [
          'Relations avec collègues : Excellent',
          'Relations avec manager : Excellent',
          'Charge de travail : Équilibrée',
          'Reconnaissance : Suffisante',
          'Environnement de travail : Agréable',
          'Équilibre vie pro/perso : Satisfaisant'
        ],
        required: false
      }
    },
    // Section Externe
    {
      id: 'q-externe-1',
      type: 'question',
      position: { x: 600, y: 300 },
      data: {
        step: '4d',
        label: 'Nature relation',
        question: 'Depuis combien de temps travaillez-vous avec l\'entreprise ?',
        questionType: 'radio',
        options: ['Moins de 6 mois', '6 mois - 1 an', '1-3 ans', '3-5 ans', 'Plus de 5 ans'],
        required: true
      }
    },
    {
      id: 'q-externe-2',
      type: 'question',
      position: { x: 600, y: 400 },
      data: {
        step: '5d',
        label: 'Évaluation collaboration',
        question: 'Comment évaluez-vous la collaboration ?',
        questionType: 'textarea',
        required: true
      }
    },
    // Section commune finale
    {
      id: 'q-common-1',
      type: 'question',
      position: { x: 0, y: 700 },
      data: {
        step: '8',
        label: 'Culture entreprise',
        question: 'Comment décririez-vous la culture de l\'entreprise en 3 mots ?',
        questionType: 'textarea',
        required: true
      }
    },
    {
      id: 'q-common-2',
      type: 'question',
      position: { x: 0, y: 800 },
      data: {
        step: '9',
        label: 'Valeurs prioritaires',
        question: 'Classez ces valeurs par ordre d\'importance pour vous',
        questionType: 'checkbox',
        options: [
          'Innovation',
          'Excellence opérationnelle',
          'Bien-être des employés',
          'Satisfaction client',
          'Responsabilité sociale',
          'Performance financière',
          'Développement durable',
          'Éthique et intégrité'
        ],
        required: true
      }
    },
    {
      id: 'condition-final',
      type: 'condition',
      position: { x: 0, y: 900 },
      draggable: false,
      data: {
        step: '10',
        label: 'Analyse finale',
        conditionType: 'single',
        description: 'Orientation vers conclusion personnalisée',
        branches: [
          { id: 'branch-positive', label: 'Expérience positive', condition: 'overallSentiment > 7' },
          { id: 'branch-neutre', label: 'Expérience neutre', condition: 'overallSentiment >= 5 && overallSentiment <= 7' },
          { id: 'branch-negative', label: 'Expérience négative', condition: 'overallSentiment < 5' }
        ]
      }
    },
    {
      id: 'audio-final-positive',
      type: 'audio',
      position: { x: -300, y: 1000 },
      data: {
        step: '11a',
        label: 'Méditation Gratitude',
        audioTitle: 'Cultiver la gratitude professionnelle',
        audioUrl: '/audio/gratitude-pro.mp3',
        duration: '10:00',
        autoPlay: false
      }
    },
    {
      id: 'audio-final-negative',
      type: 'audio',
      position: { x: 300, y: 1000 },
      data: {
        step: '11b',
        label: 'Méditation Résilience',
        audioTitle: 'Renforcer votre résilience',
        audioUrl: '/audio/resilience.mp3',
        duration: '12:00',
        autoPlay: false
      }
    },
    {
      id: 'q-final-action',
      type: 'question',
      position: { x: 0, y: 1100 },
      data: {
        step: '12',
        label: 'Plan d\'action',
        question: 'Quelles sont vos 3 actions prioritaires suite à ce diagnostic ?',
        questionType: 'textarea',
        required: true
      }
    },
    {
      id: 'q-final-followup',
      type: 'question',
      position: { x: 0, y: 1200 },
      data: {
        step: '13',
        label: 'Suivi',
        question: 'Souhaitez-vous un suivi personnalisé ?',
        questionType: 'radio',
        options: [
          'Oui, dans 1 mois',
          'Oui, dans 3 mois',
          'Oui, dans 6 mois',
          'Non merci'
        ],
        required: true
      }
    },
    { 
      id: 'end', 
      type: 'end', 
      position: { x: 0, y: 1300 }, 
      data: { 
        step: '14', 
        name: 'Fin',
        label: 'Diagnostic terminé',
        message: 'Merci pour votre participation. Votre diagnostic 360° a été enregistré et un rapport détaillé vous sera envoyé sous 48h. Prenez soin de vous et continuez à cultiver l\'excellence !'
      } 
    }
  ],
  edges: [
    // Flux initial
    { id: 'e-start-profile', source: 'start', target: 'q-profile', type: 'add-node' },
    { id: 'e-profile-condition', source: 'q-profile', target: 'condition-profile', type: 'add-node' },
    
    // Branches par profil
    { id: 'e-cond-dirigeant', source: 'condition-profile', sourceHandle: 'branch-dirigeant', target: 'q-dirigeant-1', type: 'simple-condition', label: 'Dirigeant' },
    { id: 'e-cond-manager', source: 'condition-profile', sourceHandle: 'branch-manager', target: 'q-manager-1', type: 'simple-condition', label: 'Manager' },
    { id: 'e-cond-employe', source: 'condition-profile', sourceHandle: 'branch-employe', target: 'q-employe-1', type: 'simple-condition', label: 'Employé' },
    { id: 'e-cond-externe', source: 'condition-profile', sourceHandle: 'branch-externe', target: 'q-externe-1', type: 'simple-condition', label: 'Externe' },
    
    // Flux dirigeant
    { id: 'e-dir1-dir2', source: 'q-dirigeant-1', target: 'q-dirigeant-2', type: 'add-node' },
    { id: 'e-dir2-audio', source: 'q-dirigeant-2', target: 'audio-dirigeant', type: 'add-node' },
    { id: 'e-audio-dir-common', source: 'audio-dirigeant', target: 'q-common-1', type: 'add-node' },
    
    // Flux manager
    { id: 'e-man1-man2', source: 'q-manager-1', target: 'q-manager-2', type: 'add-node' },
    { id: 'e-man2-cond', source: 'q-manager-2', target: 'condition-manager-stress', type: 'add-node' },
    { id: 'e-cond-stress-high', source: 'condition-manager-stress', sourceHandle: 'branch-stress-high', target: 'audio-manager-stress', type: 'simple-condition', label: 'Stress élevé' },
    { id: 'e-cond-stress-normal', source: 'condition-manager-stress', sourceHandle: 'branch-stress-normal', target: 'q-common-1', type: 'simple-condition', label: 'Normal' },
    { id: 'e-audio-stress-common', source: 'audio-manager-stress', target: 'q-common-1', type: 'add-node' },
    
    // Flux employé
    { id: 'e-emp1-emp2', source: 'q-employe-1', target: 'q-employe-2', type: 'add-node' },
    { id: 'e-emp2-wellbeing', source: 'q-employe-2', target: 'q-employe-wellbeing', type: 'add-node' },
    { id: 'e-wellbeing-common', source: 'q-employe-wellbeing', target: 'q-common-1', type: 'add-node' },
    
    // Flux externe
    { id: 'e-ext1-ext2', source: 'q-externe-1', target: 'q-externe-2', type: 'add-node' },
    { id: 'e-ext2-common', source: 'q-externe-2', target: 'q-common-1', type: 'add-node' },
    
    // Flux commun final
    { id: 'e-common1-common2', source: 'q-common-1', target: 'q-common-2', type: 'add-node' },
    { id: 'e-common2-cond-final', source: 'q-common-2', target: 'condition-final', type: 'add-node' },
    { id: 'e-cond-final-pos', source: 'condition-final', sourceHandle: 'branch-positive', target: 'audio-final-positive', type: 'simple-condition', label: 'Positif' },
    { id: 'e-cond-final-neu', source: 'condition-final', sourceHandle: 'branch-neutre', target: 'q-final-action', type: 'simple-condition', label: 'Neutre' },
    { id: 'e-cond-final-neg', source: 'condition-final', sourceHandle: 'branch-negative', target: 'audio-final-negative', type: 'simple-condition', label: 'Négatif' },
    { id: 'e-audio-pos-action', source: 'audio-final-positive', target: 'q-final-action', type: 'add-node' },
    { id: 'e-audio-neg-action', source: 'audio-final-negative', target: 'q-final-action', type: 'add-node' },
    { id: 'e-action-followup', source: 'q-final-action', target: 'q-final-followup', type: 'add-node' },
    { id: 'e-followup-end', source: 'q-final-followup', target: 'end', type: 'add-node' }
  ]
}

export const templates: QuestionnaireTemplate[] = [
  emotionalLiberationTemplate,
  satisfactionClientTemplate,
  evaluationEmployeTemplate,
  sondageSimpleTemplate,
  questionnaireComplexeTemplate
]

export function getTemplateById(id: string): QuestionnaireTemplate | undefined {
  return templates.find(t => t.id === id)
}