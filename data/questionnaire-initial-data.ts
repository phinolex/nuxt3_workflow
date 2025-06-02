import type { Node, Edge } from '@vue-flow/core'

export const initialNodes: Node[] = [
	{ 
		id: 'start', 
		type: 'trigger', 
		position: { x: 0, y: 0 }, 
		data: { 
			step: '1', 
			name: 'Démarrer', 
			label: 'Début du questionnaire'
		} 
	},
	{
		id: 'q1',
		type: 'question',
		position: { x: 0, y: 100 },
		data: {
			step: '2',
			label: 'Question 1',
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
			label: 'Question 2',
			question: 'Depuis quand as-tu ce comportement, cette sensation ?',
			questionType: 'checkbox',
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
			label: 'Question 3 - Clé',
			question: 'Qui de ta famille est comme toi ou possède le même comportement ?',
			questionType: 'checkbox',
			options: ['Maman', 'Papa', 'Mamie', 'Papi', 'Frère', 'Soeur'],
			required: true
		}
	},
	{
		id: 'condition1',
		type: 'condition',
		position: { x: 0, y: 400 },
		data: {
			step: '5',
			label: 'Vérifier réponse Q3',
			conditionType: 'single',
			description: 'Redirige vers l\'audio correspondant',
			branches: [
				{ id: 'condition1-maman', label: 'Maman', condition: 'response === "Maman"' },
				{ id: 'condition1-papa', label: 'Papa', condition: 'response === "Papa"' },
				{ id: 'condition1-plusieurs', label: 'Plusieurs', condition: 'responseCount > 1' }
			]
		}
	},
	{
		id: 'audio-maman',
		type: 'audio',
		position: { x: -200, y: 500 },
		data: {
			step: '6a',
			label: 'Audio Maman',
			audioTitle: 'Méditation - Maman',
			audioUrl: '/audio/maman.mp3',
			duration: '5:30',
			autoPlay: true
		}
	},
	{
		id: 'audio-papa',
		type: 'audio',
		position: { x: 0, y: 500 },
		data: {
			step: '6b',
			label: 'Audio Papa',
			audioTitle: 'Méditation - Papa',
			audioUrl: '/audio/papa.mp3',
			duration: '5:30',
			autoPlay: true
		}
	},
	{
		id: 'audio-plusieurs',
		type: 'audio',
		position: { x: 200, y: 500 },
		data: {
			step: '6c',
			label: 'Audio Plusieurs',
			audioTitle: 'Méditation - Plusieurs membres',
			audioUrl: '/audio/plusieurs.mp3',
			duration: '7:00',
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
			label: 'Questionnaire terminé'
		} 
	}
]

export const initialEdges: Edge[] = [
	{ id: 'e-start-q1', source: 'start', target: 'q1', type: 'add-node' },
	{ id: 'e-q1-q2', source: 'q1', target: 'q2', type: 'add-node' },
	{ id: 'e-q2-q3', source: 'q2', target: 'q3', type: 'add-node' },
	{ id: 'e-q3-condition', source: 'q3', target: 'condition1', type: 'add-node' },
	{ id: 'e-condition-maman', source: 'condition1', sourceHandle: 'condition1-maman', target: 'audio-maman', type: 'simple-condition', label: 'Maman' },
	{ id: 'e-condition-papa', source: 'condition1', sourceHandle: 'condition1-papa', target: 'audio-papa', type: 'simple-condition', label: 'Papa' },
	{ id: 'e-condition-plusieurs', source: 'condition1', sourceHandle: 'condition1-plusieurs', target: 'audio-plusieurs', type: 'simple-condition', label: 'Plusieurs' },
	{ id: 'e-audio-maman-end', source: 'audio-maman', target: 'end', type: 'add-node' },
	{ id: 'e-audio-papa-end', source: 'audio-papa', target: 'end', type: 'add-node' },
	{ id: 'e-audio-plusieurs-end', source: 'audio-plusieurs', target: 'end', type: 'add-node' }
]