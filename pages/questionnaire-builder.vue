<script lang="ts" setup>
import type { Edge, GraphEdge, GraphNode, Node } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MarkerType, Panel, VueFlow, getConnectedEdges, useVueFlow } from '@vue-flow/core'
import { nextTick, ref, watch, computed, onMounted } from 'vue'
import { NButton, NIcon, NSpace, useMessage, useDialog } from 'naive-ui'
import { Icon } from '@iconify/vue'

// Import des composants personnalisés
import TriggerNode from '../components/TriggerNode.vue'
import QuestionNode from '../components/nodes/QuestionNode.vue'
import AudioNode from '../components/nodes/AudioNode.vue'
import ConditionNode from '../components/nodes/ConditionNode.vue'
import EndNode from '../components/EndNode.vue'
import QuestionnaireAddNodeEdge from '../components/QuestionnaireAddNodeEdge.vue'
import SimpleConditionEdge from '../components/SimpleConditionEdge.vue'
import ActionGhostNode from '../components/ActionGhostNode.vue'
import AddElementNode from '../components/AddElementNode.vue'

// Import des modals de configuration
import QuestionConfigModal from '../components/QuestionConfigModal.vue'
import AudioConfigModal from '../components/AudioConfigModal.vue'
import ConditionConfigModal from '../components/ConditionConfigModal.vue'

import { useLayout } from '../composables/useLayout'

const message = useMessage()
const dialog = useDialog()

const {
	addEdges,
	addNodes,
	removeNodes,
	removeEdges,
	findNode,
	fitView,
	onConnect,
	onNodeDrag,
	onNodeDragStart,
	onNodeDragStop,
	updateEdge,
	updateNode,
	updateNodeInternals,
	onNodesChange,
	onEdgesChange,
	onNodesInitialized,
	getNodes,
	getEdges,
} = useVueFlow()

const { layout } = useLayout()

// États pour les modals
const showQuestionModal = ref(false)
const showAudioModal = ref(false)
const showConditionModal = ref(false)
const currentEditNode = ref<Node | null>(null)

// Initialisation avec la structure du questionnaire
const nodes = ref<Node[]>([
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
])

const edges = ref<Edge[]>([
	{ id: 'e-start-q1', source: 'start', target: 'q1', type: 'add-node' },
	{ id: 'e-q1-q2', source: 'q1', target: 'q2', type: 'add-node' },
	{ id: 'e-q2-q3', source: 'q2', target: 'q3', type: 'add-node' },
	{ id: 'e-q3-condition', source: 'q3', target: 'condition1', type: 'add-node' },
	{ id: 'e-condition-maman', source: 'condition1', sourceHandle: 'condition1-maman', target: 'audio-maman', type: 'add-node', label: 'Maman' },
	{ id: 'e-condition-papa', source: 'condition1', sourceHandle: 'condition1-papa', target: 'audio-papa', type: 'add-node', label: 'Papa' },
	{ id: 'e-condition-plusieurs', source: 'condition1', sourceHandle: 'condition1-plusieurs', target: 'audio-plusieurs', type: 'add-node', label: 'Plusieurs' },
	{ id: 'e-audio-maman-end', source: 'audio-maman', target: 'end', type: 'add-node' },
	{ id: 'e-audio-papa-end', source: 'audio-papa', target: 'end', type: 'add-node' },
	{ id: 'e-audio-plusieurs-end', source: 'audio-plusieurs', target: 'end', type: 'add-node' }
])

const isDragging = ref(false)

// Gestionnaires d'événements pour les nodes
const handleNodeEdit = (nodeId: string) => {
	const node = findNode(nodeId)
	if (!node) return

	currentEditNode.value = node
	
	switch (node.type) {
		case 'question':
			showQuestionModal.value = true
			break
		case 'audio':
			showAudioModal.value = true
			break
		case 'condition':
			showConditionModal.value = true
			break
	}
}

const handleNodeDelete = (nodeId: string) => {
	const node = findNode(nodeId)
	if (!node) return
	
	// Reconnecter les edges
	const connectedEdges = getConnectedEdges([node], edges.value)
	const incomingEdge = connectedEdges.find(edge => edge.target === nodeId)
	const outgoingEdge = connectedEdges.find(edge => edge.source === nodeId)
	
	// Vérifier si ce node est connecté à une condition via sourceHandle
	if (incomingEdge && incomingEdge.sourceHandle) {
		const sourceNode = findNode(incomingEdge.source)
		if (sourceNode && sourceNode.type === 'condition') {
			// Remplacer par un node "Ajouter un élément"
			const addElementId = `${nodeId}-add-element`
			addNodes({
				id: addElementId,
				type: 'add-element',
				position: node.position,
				data: {
					conditionBranch: incomingEdge.sourceHandle,
					branchLabel: incomingEdge.label || 'Chemin'
				}
			})
			
			// Reconnecter l'edge avec animation
			removeEdges([incomingEdge])
			addEdges({
				...incomingEdge,
				id: incomingEdge.id,
				target: addElementId,
				type: 'simple-condition',
				animated: true
			})
			
			// Si il y avait un edge sortant, le supprimer
			if (outgoingEdge) {
				removeEdges([outgoingEdge])
			}
		} else if (incomingEdge && outgoingEdge) {
			// Comportement normal : reconnecter
			addEdges({
				id: `e-${incomingEdge.source}-${outgoingEdge.target}`,
				source: incomingEdge.source,
				target: outgoingEdge.target,
				type: 'add-node'
			})
		}
	} else if (incomingEdge && outgoingEdge) {
		// Comportement normal : reconnecter
		addEdges({
			id: `e-${incomingEdge.source}-${outgoingEdge.target}`,
			source: incomingEdge.source,
			target: outgoingEdge.target,
			type: 'add-node'
		})
	}
	
	removeNodes([node])
}

// Gestionnaire pour le remplacement du node "Ajouter un élément"
const handleAddElementReplaced = (event: any) => {
	// Retirer l'animation de l'edge
	const edge = edges.value.find(e => e.target === event.newNodeId)
	if (edge) {
		updateEdge(edge.id, { animated: false })
	}
}

// Gestionnaires pour les modals
const handleQuestionConfirm = (data: any) => {
	if (currentEditNode.value) {
		updateNode(currentEditNode.value.id, { data: { ...currentEditNode.value.data, ...data } })
		currentEditNode.value = null
	}
}

const handleAudioConfirm = (data: any) => {
	if (currentEditNode.value) {
		updateNode(currentEditNode.value.id, { data: { ...currentEditNode.value.data, ...data } })
		currentEditNode.value = null
	}
}

const handleConditionConfirm = async (data: any) => {
	if (!currentEditNode.value) return
	
	const nodeId = currentEditNode.value.id
	const conditionNode = nodes.value.find(n => n.id === nodeId)
	if (!conditionNode) return
	
	// Étape 1: Sauvegarder l'état actuel des connexions
	const existingConnections = new Map<string, { target: string, edge: Edge }>()
	edges.value.filter(edge => edge.source === nodeId).forEach(edge => {
		if (edge.sourceHandle) {
			existingConnections.set(edge.sourceHandle, { target: edge.target, edge })
		}
	})
	
	// Étape 2: Supprimer TOUS les edges sortants AVANT de mettre à jour le node
	const edgesToRemove = edges.value.filter(edge => edge.source === nodeId)
	if (edgesToRemove.length > 0) {
		removeEdges(edgesToRemove.map(e => e.id))
		await nextTick()
	}
	
	// Étape 3: Mettre à jour les données du node
	updateNode(nodeId, { data: { ...currentEditNode.value.data, ...data } })
	
	// Étape 4: Forcer la mise à jour des handles internes du node
	await nextTick()
	updateNodeInternals([nodeId])
	
	// Étape 5: Attendre que Vue Flow traite la mise à jour
	await nextTick()
	await new Promise(resolve => setTimeout(resolve, 150))
	
	// Étape 6: Créer les nouveaux nodes et préparer les edges
	const newNodes: Node[] = []
	const newEdges: Edge[] = []
	const nodesToUpdate: { id: string, position: { x: number, y: number } }[] = []
	
	// Calculer les positions pour TOUS les chemins (existants et nouveaux)
	const totalBranches = data.branches.length
	const spaceBetweenNodes = 200 // Espace entre les nodes
	
	// Centre du node condition
	const conditionCenterX = conditionNode.position.x + 100 // Le node condition fait 200px de large
	
	for (let i = 0; i < data.branches.length; i++) {
		const branch = data.branches[i]
		const existingConnection = existingConnections.get(branch.id)
		
		// Calculer la position X pour centrer le groupe sous le node condition
		// Pour 2 branches: -100, 100 (écart de 200)
		// Pour 3 branches: -200, 0, 200 (écart de 200)
		// Pour 4 branches: -300, -100, 100, 300 (écart de 200)
		const offset = (i - (totalBranches - 1) / 2) * spaceBetweenNodes
		const newX = conditionCenterX + offset - 120 // -120 car le node add-element fait 240px de large (moitié = 120)
		const newY = conditionNode.position.y + 150
		
		if (existingConnection && nodes.value.find(n => n.id === existingConnection.target)) {
			// Node existant à repositionner
			const targetNode = nodes.value.find(n => n.id === existingConnection.target)
			if (targetNode) {
				// Si c'est un node add-element ou ghost, on le repositionne
				if (existingConnection.target.includes('ghost') || existingConnection.target.includes('add-element')) {
					nodesToUpdate.push({
						id: existingConnection.target,
						position: { x: newX, y: newY }
					})
				}
			}
			
			// Reconnecter avec le bon sourceHandle
			newEdges.push({
				id: `e-${nodeId}-${branch.id}-${existingConnection.target}`,
				source: nodeId,
				sourceHandle: branch.id,
				target: existingConnection.target,
				type: 'simple-condition',
				label: branch.label,
				animated: existingConnection.target.includes('ghost') || existingConnection.target.includes('add-element')
			})
		} else {
			// Créer un nouveau node add-element
			const ghostId = `${nodeId}-${branch.id}-ghost`
			
			newNodes.push({
				id: ghostId,
				type: 'add-element',
				position: {
					x: newX,
					y: newY
				},
				data: {
					label: `Suite: ${branch.label}`,
					isGhost: true,
					conditionBranch: branch.id,
					branchLabel: branch.label
				}
			})
			
			newEdges.push({
				id: `e-${nodeId}-${branch.id}-${ghostId}`,
				source: nodeId,
				sourceHandle: branch.id,
				target: ghostId,
				type: 'simple-condition',
				label: branch.label,
				animated: true
			})
		}
	}
	
	// Étape 7: Mettre à jour les positions des nodes existants
	for (const nodeUpdate of nodesToUpdate) {
		updateNode(nodeUpdate.id, { position: nodeUpdate.position })
	}
	
	// Étape 8: Ajouter les nouveaux nodes s'il y en a
	if (newNodes.length > 0) {
		addNodes(newNodes)
		await nextTick()
	}
	
	// Étape 9: Forcer une nouvelle mise à jour des handles après l'ajout des nodes
	updateNodeInternals([nodeId])
	await nextTick()
	await new Promise(resolve => setTimeout(resolve, 100))
	
	// Étape 10: Ajouter tous les nouveaux edges
	if (newEdges.length > 0) {
		addEdges(newEdges)
	}
	
	// Étape 11: Forcer une dernière mise à jour pour s'assurer que tout est connecté
	await nextTick()
	updateNodeInternals([nodeId])
	
	// Réorganiser le graphe
	setTimeout(() => {
		layoutGraph()
	}, 200)
	
	currentEditNode.value = null
}

// Gérer les connexions manuelles
const handleConnect = async (params: any) => {
	console.log('=== handleConnect called ===')
	console.log('params:', params)
	
	// Vérifier si on connecte depuis un handle de condition
	const sourceNode = nodes.value.find(n => n.id === params.source)
	const targetNode = nodes.value.find(n => n.id === params.target)
	
	console.log('sourceNode:', sourceNode)
	console.log('targetNode:', targetNode)
	
	// Si le sourceNode n'est pas trouvé, attendre un peu et réessayer
	if (!sourceNode && targetNode) {
		console.log('Source node not found, waiting and retrying...')
		await nextTick()
		setTimeout(() => {
			const retrySourceNode = nodes.value.find(n => n.id === params.source)
			if (retrySourceNode) {
				console.log('Found source node on retry, calling handleConnect again')
				handleConnect(params)
			} else {
				console.log('Source node still not found after retry')
			}
		}, 100)
		return
	}
	
	if (!sourceNode || !targetNode) return
	
	// Vérifier si on connecte VERS une branche de condition qui a déjà une connexion
	// On doit regarder les edges qui PARTENT du node SOURCE (d'où on tire la connexion)
	const incomingEdgesToSource = edges.value.filter(e => e.target === params.source)
	console.log('incomingEdgesToSource:', incomingEdgesToSource)
	
	// Vérifier si le node source est connecté depuis une condition
	const isSourceFromCondition = incomingEdgesToSource.some(edge => {
		const edgeSourceNode = nodes.value.find(n => n.id === edge.source)
		return edgeSourceNode?.type === 'condition' && edge.sourceHandle
	})
	
	console.log('isSourceFromCondition:', isSourceFromCondition)
	
	// Vérifier si le node source a une connexion vers un node "end" à supprimer
	// Cela s'applique à tous les types de nodes, pas seulement ceux venant de conditions
	const outgoingEdgesFromSource = edges.value.filter(e => e.source === params.source)
	console.log('outgoingEdgesFromSource:', outgoingEdgesFromSource)
	
	// Vérifier s'il y a une connexion vers un node "end"
	const endConnection = outgoingEdgesFromSource.find(edge => {
		const targetNode = nodes.value.find(n => n.id === edge.target)
		return targetNode?.type === 'end'
	})
	
	if (endConnection) {
		console.log('Found end connection to remove:', endConnection)
		const endNodeId = endConnection.target
		
		// Supprimer l'edge et le node "end"
		removeEdges([endConnection.id])
		removeNodes([endNodeId])
		console.log('Removed end node and edge')
		
		// Attendre que la suppression soit effective
		await nextTick()
	}
	
	// Utiliser le type add-node pour avoir le bouton "+"
	let edgeType = 'add-node'
	let edgeLabel = ''
	
	if (sourceNode.type === 'condition' && params.sourceHandle) {
		// Trouver le label de la branche
		const branch = sourceNode.data.branches?.find((b: any) => b.id === params.sourceHandle)
		if (branch) {
			edgeLabel = branch.label
		}
	}
	
	// Créer le nouvel edge
	const newEdge = {
		id: `e-${params.source}-${params.sourceHandle || 'default'}-${params.target}`,
		source: params.source,
		sourceHandle: params.sourceHandle,
		target: params.target,
		targetHandle: params.targetHandle,
		type: edgeType,
		label: edgeLabel
	}
	
	console.log('Creating new edge:', newEdge)
	addEdges(newEdge)
	console.log('edges after addition:', edges.value)
	
	// Réorganiser le graphe après la connexion
	setTimeout(() => {
		layoutGraph()
	}, 100)
}

// Layout automatique
onNodesInitialized(() => {
	// Attendre un peu plus pour s'assurer que tout est chargé
	setTimeout(() => {
		layoutAndFitGraph()
	}, 100)
})

// S'assurer que le layout est appliqué après le montage
onMounted(() => {
	setTimeout(() => {
		layoutAndFitGraph()
	}, 200)
})

async function layoutGraph() {
	try {
		// S'assurer que tous les nodes existent
		const allNodesExist = nodes.value.every(node => findNode(node.id))
		
		if (!allNodesExist) {
			console.warn('Not all nodes are initialized yet, retrying layout...')
			setTimeout(() => layoutGraph(), 100)
			return
		}
		
		// Forcer le recalcul du layout avec des options améliorées
		const layoutedNodes = layout(nodes.value, edges.value, {
			direction: 'TB',
			nodeSpacing: 200,
			layerSpacing: 150
		})
		nodes.value = [...layoutedNodes]
		
		// Forcer la mise à jour des edges
		await nextTick()
		edges.value = [...edges.value]
		
		// Après le layout, ajuster les positions pour un meilleur alignement
		setTimeout(() => {
			alignConvergingNodes()
		}, 50)
	} catch (error) {
		console.error('Error during layout:', error)
	}
}

// Fonction pour aligner les nodes qui convergent vers un même point
function alignConvergingNodes() {
	// Grouper les nodes par niveau Y (avec une tolérance)
	const tolerance = 30
	const nodesByLevel = new Map()
	
	nodes.value.forEach(node => {
		// Arrondir la position Y pour grouper les nodes proches
		const roundedY = Math.round(node.position.y / tolerance) * tolerance
		
		if (!nodesByLevel.has(roundedY)) {
			nodesByLevel.set(roundedY, [])
		}
		nodesByLevel.get(roundedY).push(node)
	})
	
	// Pour chaque niveau, aligner les nodes sur la même ligne
	nodesByLevel.forEach((nodesAtLevel, levelY) => {
		if (nodesAtLevel.length > 1) {
			// Calculer la position Y moyenne pour ce niveau
			const avgY = nodesAtLevel.reduce((sum, node) => sum + node.position.y, 0) / nodesAtLevel.length
			
			// Aligner tous les nodes de ce niveau sur la même position Y
			nodesAtLevel.forEach(node => {
				updateNode(node.id, {
					position: {
						x: node.position.x,
						y: avgY
					}
				})
			})
		}
	})
}

async function layoutAndFitGraph() {
	await layoutGraph()
	await nextTick()
	setTimeout(() => {
		fitView({ padding: 0.2 })
	}, 100)
}

// Drag & Drop handling (réutilisé du code original)
onNodeDragStart((params) => {
	const { node } = params
	isDragging.value = true
	const ghostId = `${node.id}-ghost`
	
	// Créer un ghost node identique au node original
	const ghostNode = {
		...node,
		id: ghostId,
		data: {
			...node.data,
			isGhost: true // Marquer comme ghost pour le style
		}
	} satisfies GraphNode
	
	addNodes(ghostNode)
	
	const connectedEdges = getConnectedEdges([node], edges.value) as GraphEdge[]
	for (const edge of connectedEdges) {
		edge.source = edge.source === node.id ? ghostId : edge.source
		edge.target = edge.target === node.id ? ghostId : edge.target
	}
})

onNodeDrag((params) => {
	const { node, intersections } = params
	if (!intersections || intersections.length === 0) return
	
	const ghostId = `${node.id}-ghost`
	const ghostNode = findNode(ghostId)
	if (!ghostNode) return
	
	const intersectionNode = intersections[0]
	if (intersectionNode === ghostNode) return
	
	const ghostPosition = {
		x: intersectionNode.position.x + intersectionNode.dimensions.width / 2 - ghostNode.dimensions.width / 2,
		y: intersectionNode.position.y,
	}
	
	const intersectionPosition = {
		x: ghostNode.position.x + ghostNode.dimensions.width / 2 - intersectionNode.dimensions.width / 2,
		y: ghostNode.position.y,
	}
	
	updateNode(ghostId, { position: ghostPosition })
	updateNode(intersectionNode.id, { position: intersectionPosition })
	
	const connectedEdges = getConnectedEdges([intersectionNode, ghostNode], edges.value) as GraphEdge[]
	for (const edge of connectedEdges) {
		let newSource = edge.source
		let newTarget = edge.target
		
		if (edge.source === ghostId) newSource = intersectionNode.id
		if (edge.target === ghostId) newTarget = intersectionNode.id
		if (edge.source === intersectionNode.id) newSource = ghostId
		if (edge.target === intersectionNode.id) newTarget = ghostId
		
		edge.source = newSource
		edge.target = newTarget
	}
})

onNodeDragStop((params) => {
	const { node } = params
	const ghostId = `${node.id}-ghost`
	const ghostNode = findNode(ghostId)
	
	if (!ghostNode) return
	
	const connectedEdges = getConnectedEdges([ghostNode], edges.value) as GraphEdge[]
	for (const edge of connectedEdges) {
		edge.source = edge.source === ghostId ? node.id : edge.source
		edge.target = edge.target === ghostId ? node.id : edge.target
	}
	
	removeNodes([ghostNode])
	isDragging.value = false
	
	nextTick(() => {
		setTimeout(() => {
			layoutGraph()
		}, 50)
	})
})

// Sauvegarder le workflow
const saveWorkflow = () => {
	const workflow = {
		nodes: nodes.value,
		edges: edges.value,
		metadata: {
			name: 'Questionnaire de libération émotionnelle',
			version: '1.0',
			createdAt: new Date().toISOString()
		}
	}
	
	const json = JSON.stringify(workflow, null, 2)
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `questionnaire-${Date.now()}.json`
	a.click()
	URL.revokeObjectURL(url)
	
	message.success('Questionnaire sauvegardé avec succès')
}

// Charger un workflow
const loadWorkflow = () => {
	const input = document.createElement('input')
	input.type = 'file'
	input.accept = '.json'
	input.onchange = async (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0]
		if (!file) return
		
		try {
			const text = await file.text()
			const workflow = JSON.parse(text)
			
			nodes.value = workflow.nodes
			edges.value = workflow.edges
			
			await nextTick()
			layoutAndFitGraph()
			
			message.success('Questionnaire chargé avec succès')
		} catch (error) {
			message.error('Erreur lors du chargement du fichier')
		}
	}
	input.click()
}

// Prévisualiser le questionnaire
const previewQuestionnaire = () => {
	// Sauvegarder le workflow dans le localStorage pour la page de preview
	const workflow = {
		nodes: nodes.value,
		edges: edges.value
	}
	localStorage.setItem('currentQuestionnaire', JSON.stringify(workflow))
	
	// Ouvrir la page de preview dans un nouvel onglet
	window.open('/questionnaire-preview', '_blank')
}

// Workflow JSON computed
const workflowJSON = computed(() => {
	return {
		nodes: nodes.value.map(node => ({
			id: node.id,
			type: node.type,
			position: node.position,
			data: node.data
		})),
		edges: edges.value.map(edge => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			type: edge.type,
			label: edge.label,
			sourceHandle: edge.sourceHandle
		}))
	}
})

// Observer les changements
watch(workflowJSON, (newWorkflow) => {
	console.log('Workflow mis à jour:', newWorkflow)
}, { deep: true })
</script>

<template>
	<div style="height: 100vh; display: flex; flex-direction: column;">
		<!-- Barre d'outils -->
		<div class="toolbar">
			<div class="toolbar-title">
				<h2>Créateur de Questionnaire</h2>
			</div>
			<n-space>
				<n-button type="primary" @click="saveWorkflow">
					<template #icon>
						<Icon icon="mdi:content-save" />
					</template>
					Sauvegarder
				</n-button>
				<n-button @click="loadWorkflow">
					<template #icon>
						<Icon icon="mdi:download" />
					</template>
					Charger
				</n-button>
				<n-button type="info" @click="previewQuestionnaire">
					<template #icon>
						<Icon icon="mdi:play" />
					</template>
					Prévisualiser
				</n-button>
			</n-space>
		</div>

		<!-- Vue Flow -->
		<div style="flex: 1;">
			<VueFlow
				v-model:nodes="nodes"
				v-model:edges="edges"
				:default-zoom="1"
				:min-zoom="0.5"
				:max-zoom="2"
				:default-edge-options="{ type: 'add-node' }"
				pan-on-scroll
				@connect="handleConnect"
			>
				<Background pattern-color="#e0e0e6" :size="0.8" :gap="16" />
				
				<Panel class="process-panel" position="top-right">
					<div class="node-palette">
						<h3>Éléments</h3>
						<div class="palette-item" draggable="true">
							<n-icon size="20" color="#2080f0" />
							<span>Question</span>
						</div>
						<div class="palette-item" draggable="true">
							<n-icon size="20" color="#f0a020" />
							<span>Condition</span>
						</div>
						<div class="palette-item" draggable="true">
							<n-icon size="20" color="#18a058" />
							<span>Audio</span>
						</div>
					</div>
				</Panel>
				
				<Controls />
				
				<!-- Templates des nodes -->
				<template #node-trigger="nodeProps">
					<TriggerNode v-bind="nodeProps" />
				</template>
				
				<template #node-question="nodeProps">
					<QuestionNode 
						v-bind="nodeProps" 
						@edit="handleNodeEdit(nodeProps.id)"
						@delete="handleNodeDelete(nodeProps.id)"
					/>
				</template>
				
				<template #node-audio="nodeProps">
					<AudioNode 
						v-bind="nodeProps"
						@edit="handleNodeEdit(nodeProps.id)"
						@delete="handleNodeDelete(nodeProps.id)"
					/>
				</template>
				
				<template #node-condition="nodeProps">
					<ConditionNode 
						v-bind="nodeProps"
						@edit="handleNodeEdit(nodeProps.id)"
						@delete="handleNodeDelete(nodeProps.id)"
					/>
				</template>
				
				<template #node-action-ghost="nodeProps">
					<ActionGhostNode v-bind="nodeProps" />
				</template>
				
				<template #node-add-element="nodeProps">
					<AddElementNode 
						v-bind="nodeProps" 
						@node-replaced="handleAddElementReplaced"
					/>
				</template>
				
				<template #node-end="nodeProps">
					<EndNode v-bind="nodeProps" />
				</template>
				
				<template #edge-add-node="edgeProps">
					<QuestionnaireAddNodeEdge 
						v-bind="edgeProps" 
						@edge-deleted="layoutGraph"
					/>
				</template>
				
				<template #edge-simple-condition="edgeProps">
					<SimpleConditionEdge v-bind="edgeProps" />
				</template>
			</VueFlow>
		</div>
		
		<!-- Modals de configuration -->
		<QuestionConfigModal 
			v-model="showQuestionModal"
			:node-data="currentEditNode?.data"
			@confirm="handleQuestionConfirm"
		/>
		
		<AudioConfigModal
			v-model="showAudioModal"
			:node-data="currentEditNode?.data"
			@confirm="handleAudioConfirm"
		/>
		
		<ConditionConfigModal
			v-model="showConditionModal"
			:node-data="currentEditNode?.data"
			:node-id="currentEditNode?.id"
			@confirm="handleConditionConfirm"
		/>
	</div>
</template>

<style scoped>
.toolbar {
	background: white;
	border-bottom: 1px solid #e0e0e6;
	padding: 16px 24px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.toolbar-title h2 {
	margin: 0;
	font-size: 20px;
	color: #333;
}

/* Style pour les ghost nodes */
:deep([data-id*="-ghost"]) {
	opacity: 0.5;
}

.process-panel {
	background-color: white;
	border: 1px solid #e0e0e6;
	padding: 16px;
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.node-palette h3 {
	margin: 0 0 12px 0;
	font-size: 14px;
	color: #666;
}

.palette-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	margin-bottom: 8px;
	background: #f8f9fa;
	border: 1px solid #e0e0e6;
	border-radius: 6px;
	cursor: grab;
	transition: all 0.2s ease;
}

.palette-item:hover {
	background: #e8f4fd;
	border-color: #2080f0;
}

.palette-item:active {
	cursor: grabbing;
}

:deep(.vue-flow__node) {
	cursor: pointer;
}

:deep(.vue-flow__handle) {
	width: 10px;
	height: 10px;
}
</style>

<style>
/* Style nécessaire pour l'affichage correct des nodes */
.vue-flow__node {
	display: flex;
}
</style>