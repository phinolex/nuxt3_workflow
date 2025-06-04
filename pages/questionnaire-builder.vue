<script lang="ts" setup>
import type { Edge, GraphEdge, GraphNode, Node } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MarkerType, Panel, VueFlow, getConnectedEdges, useVueFlow } from '@vue-flow/core'
import { nextTick, ref, shallowRef, triggerRef, watch, computed, onMounted, onUnmounted, h } from 'vue'
import { NButton, NIcon, NSpace, NSpin, NRadio, NRadioGroup, useMessage, useDialog } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { debounce } from 'lodash-es'

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

// Lazy loading des données initiales
const getInitialData = () => import('../data/questionnaire-initial-data')
import { fixConditionEdges } from '../utils/fix-condition-edges.js'

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

// Fonction pour forcer la mise à jour complète des edges et handles
const forceUpdateAllConnections = async () => {
	console.log('🔄 Forçage de la mise à jour de toutes les connexions')
	
	// 1. Récupérer tous les nodes
	const allNodes = nodes.value.map(n => n.id)
	
	// 2. Vérifier que tous les nodes sont bien initialisés
	const uninitializedNodes = allNodes.filter(id => {
		const node = findNode(id)
		return !node || !node.dimensions || node.dimensions.width === 0
	})
	
	if (uninitializedNodes.length > 0) {
		console.log('⚠️ Nodes non initialisés détectés:', uninitializedNodes)
		
		// Forcer l'initialisation des nodes non initialisés
		for (const nodeId of uninitializedNodes) {
			const node = findNode(nodeId)
			if (node) {
				// Micro-déplacement pour forcer l'initialisation
				updateNode(nodeId, { 
					position: { 
						x: node.position.x + 0.001, 
						y: node.position.y 
					} 
				})
			}
		}
		
		await nextTick()
		await new Promise(resolve => setTimeout(resolve, 50))
	}
	
	// 3. Mettre à jour les internals de TOUS les nodes
	if (allNodes.length > 0) {
		updateNodeInternals(allNodes)
	}
	
	// 4. Attendre que VueFlow traite les changements
	await nextTick()
	
	// 5. Forcer la mise à jour des positions (avec un petit décalage pour forcer le redessin)
	nodes.value.forEach(node => {
		updateNode(node.id, { position: { x: node.position.x + 0.1, y: node.position.y } })
	})
	
	await nextTick()
	
	// 5. Remettre les positions exactes
	nodes.value.forEach(node => {
		updateNode(node.id, { position: { x: node.position.x - 0.1, y: node.position.y } })
	})
	
	await nextTick()
	
	// 6. Mettre à jour une dernière fois les internals
	updateNodeInternals(allNodes)
	
	// 7. Forcer le rafraîchissement des références
	triggerRef(nodes)
	triggerRef(edges)
	
	// 8. Forcer le recalcul des paths des edges
	edges.value = [...edges.value]
	
	console.log('✅ Mise à jour des connexions terminée')
}

// États pour les modals
const showQuestionModal = ref(false)
const showAudioModal = ref(false)
const showConditionModal = ref(false)
const currentEditNode = ref<Node | null>(null)

// Gestion des timeouts pour cleanup
const timeouts = new Set<NodeJS.Timeout>()

// Fonction pour obtenir la largeur par défaut d'un type de node
function getNodeDefaultWidth(nodeType: string): number {
	const widths = {
		'trigger': 180,
		'question': 220,
		'audio': 200,
		'condition': 200,
		'end': 200,
		'action': 180,
		'add-element': 240
	}
	return widths[nodeType] || 200
}

// Fonction pour recréer proprement les edges après suppression de nodes
async function recreateEdgesForNodes(nodeIds: string[]) {
	console.log('🔧 Recréation des edges pour les nodes:', nodeIds)
	
	// Collecter toutes les edges concernées
	const edgesToRecreate = edges.value.filter(e => 
		nodeIds.includes(e.source) || nodeIds.includes(e.target)
	)
	
	if (edgesToRecreate.length === 0) return
	
	// Sauvegarder les informations des edges
	const edgeInfos = edgesToRecreate.map(edge => ({
		id: edge.id,
		source: edge.source,
		sourceHandle: edge.sourceHandle || undefined,
		target: edge.target,
		targetHandle: edge.targetHandle || undefined,
		type: edge.type || 'add-node',
		label: edge.label || '',
		animated: edge.animated || false,
		data: edge.data || {}
	}))
	
	console.log('📝 Edges à recréer:', edgeInfos)
	
	// Supprimer les edges existantes
	removeEdges(edgeInfos.map(e => e.id))
	await nextTick()
	
	// Attendre un peu pour que les nodes soient bien initialisés
	await new Promise(resolve => setTimeout(resolve, 50))
	
	// Vérifier que les nodes source et target existent et sont initialisés
	const validEdges = edgeInfos.filter(edge => {
		const sourceNode = findNode(edge.source)
		const targetNode = findNode(edge.target)
		
		if (!sourceNode || !targetNode) {
			console.warn(`⚠️ Edge ignorée - node manquant: ${edge.id}`)
			return false
		}
		
		// Vérifier que les nodes ont des dimensions (sont initialisés)
		if (!sourceNode.dimensions || sourceNode.dimensions.width === 0) {
			console.warn(`⚠️ Edge ignorée - source non initialisé: ${edge.source}`)
			// Forcer l'initialisation du source
			updateNode(edge.source, { position: { ...sourceNode.position } })
			return false
		}
		
		if (!targetNode.dimensions || targetNode.dimensions.width === 0) {
			console.warn(`⚠️ Edge ignorée - target non initialisé: ${edge.target}`)
			// Forcer l'initialisation du target
			updateNode(edge.target, { position: { ...targetNode.position } })
			return false
		}
		
		return true
	})
	
	// Recréer les edges valides
	for (const edge of validEdges) {
		addEdges(edge)
	}
	
	console.log(`✅ ${validEdges.length}/${edgeInfos.length} edges recréées`)
	
	// Si certaines edges n'ont pas pu être créées, réessayer après un délai
	if (validEdges.length < edgeInfos.length) {
		console.log('⏳ Certaines edges non créées, nouvelle tentative dans 100ms...')
		setTimeout(async () => {
			await nextTick()
			updateNodeInternals(nodeIds)
			
			// Réessayer avec les edges manquantes
			const missingEdges = edgeInfos.filter(e => 
				!edges.value.some(existing => existing.id === e.id)
			)
			
			for (const edge of missingEdges) {
				const sourceNode = findNode(edge.source)
				const targetNode = findNode(edge.target)
				
				if (sourceNode && targetNode && 
					sourceNode.dimensions && sourceNode.dimensions.width > 0 &&
					targetNode.dimensions && targetNode.dimensions.width > 0) {
					addEdges(edge)
					console.log(`✅ Edge recréée au 2e essai: ${edge.id}`)
				}
			}
		}, 100)
	}
	
	await nextTick()
	
	// Mettre à jour les internals des nodes concernés
	updateNodeInternals(nodeIds)
}

// Fonction pour obtenir tous les nodes en aval d'un node donné
function getDownstreamNodes(nodeId: string): string[] {
	const downstream = new Set<string>()
	const toProcess = [nodeId]
	
	while (toProcess.length > 0) {
		const currentId = toProcess.shift()
		const outgoingEdges = edges.value.filter(e => e.source === currentId)
		
		for (const edge of outgoingEdges) {
			if (!downstream.has(edge.target)) {
				downstream.add(edge.target)
				toProcess.push(edge.target)
			}
		}
	}
	
	return Array.from(downstream)
}

// Fonction pour réaligner tout le workflow en aval d'un node
async function realignDownstreamWorkflow(nodeId: string) {
	const node = findNode(nodeId)
	if (!node) return
	
	// Obtenir le centre du node de référence
	const nodeWidth = node.dimensions?.width || getNodeDefaultWidth(node.type)
	const nodeCenterX = node.position.x + nodeWidth / 2
	
	// Obtenir tous les nodes en aval
	const downstreamIds = getDownstreamNodes(nodeId)
	
	// Pour chaque niveau en aval, aligner les nodes
	const processedNodes = new Set<string>()
	const queue = edges.value.filter(e => e.source === nodeId).map(e => ({
		nodeId: e.target,
		parentCenterX: nodeCenterX
	}))
	
	while (queue.length > 0) {
		const { nodeId: currentId, parentCenterX } = queue.shift()
		if (processedNodes.has(currentId)) continue
		
		const currentNode = findNode(currentId)
		if (!currentNode) continue
		
		// Calculer la nouvelle position centrée
		const currentWidth = currentNode.dimensions?.width || getNodeDefaultWidth(currentNode.type)
		const newX = parentCenterX - currentWidth / 2
		
		// Mettre à jour la position
		updateNode(currentId, {
			position: {
				x: newX,
				y: currentNode.position.y
			}
		})
		
		processedNodes.add(currentId)
		
		// Obtenir le nouveau centre pour les nodes enfants
		const currentCenterX = newX + currentWidth / 2
		
		// Ajouter les nodes enfants à la queue
		edges.value
			.filter(e => e.source === currentId)
			.forEach(e => {
				queue.push({
					nodeId: e.target,
					parentCenterX: currentCenterX
				})
			})
	}
	
	// Mettre à jour les internals de tous les nodes modifiés
	const allModifiedNodes = [nodeId, ...downstreamIds]
	updateNodeInternals(allModifiedNodes)
}

// Fonction pour ajuster les positions Y après suppression d'un node
async function adjustVerticalPositionsAfterDeletion(deletedNodePosition: { x: number, y: number }, restoredNodeId: string, previousTargetNodeId: string | null = null) {
	console.log('📏 Ajustement vertical après suppression')
	console.log('Position du node supprimé:', deletedNodePosition)
	console.log('Node cible précédent:', previousTargetNodeId)
	
	// Trouver le node restauré
	const restoredNode = findNode(restoredNodeId)
	if (!restoredNode) return
	
	// Si on connaît le node cible qui était connecté au node supprimé, l'ajuster directement
	if (previousTargetNodeId) {
		const targetNode = findNode(previousTargetNodeId)
		if (targetNode && !targetNode.data?._temporaryLock) {
			// Calculer la nouvelle position Y (position du node restauré + espacement)
			const newY = restoredNode.position.y + 150
			const deltaY = targetNode.position.y - newY
			
			// Si le node doit être déplacé
			if (Math.abs(deltaY) > 10) {
				console.log(`📍 Ajustement du node cible ${previousTargetNodeId}: deltaY = ${deltaY}`)
				
				// Déplacer ce node et tous ses descendants
				const allDescendants = [previousTargetNodeId, ...getDownstreamNodes(previousTargetNodeId)]
				
				allDescendants.forEach(descendantId => {
					const descendant = findNode(descendantId)
					if (descendant && !descendant.data?._temporaryLock && !descendant.data?._lockedPosition) {
						const adjustedY = descendant.position.y - deltaY
						updateNode(descendantId, {
							position: {
								x: descendant.position.x,
								y: adjustedY
							}
						})
						console.log(`📍 Node ${descendantId} ajusté de Y=${descendant.position.y} à Y=${adjustedY}`)
					}
				})
				
				// Mettre à jour les internals
				updateNodeInternals(allDescendants)
				await nextTick()
				
				// Forcer le rafraîchissement des edges
				edges.value = [...edges.value]
				triggerRef(edges)
				
				// Forcer une mise à jour complète après un court délai
				setTimeout(async () => {
					await forceUpdateAllConnections()
				}, 50)
				
				return
			}
		}
	}
	
	// Sinon, utiliser la logique existante
	// Obtenir tous les nodes directement connectés en aval du node restauré
	const directDownstream = edges.value
		.filter(e => e.source === restoredNodeId)
		.map(e => e.target)
	
	// Si pas de nodes en aval, chercher tous les nodes qui étaient en dessous
	if (directDownstream.length === 0) {
		// Trouver tous les nodes qui étaient en dessous du node supprimé
		const nodesBelow = nodes.value.filter(n => 
			n.position.y > deletedNodePosition.y + 100 && // Au moins 100px en dessous
			n.id !== restoredNodeId &&
			!n.data?._temporaryLock && // Ne pas toucher aux nodes verrouillés
			!n.data?._lockedPosition
		)
		
		if (nodesBelow.length === 0) {
			console.log('Aucun node à ajuster (pas de nodes en dessous)')
			return
		}
		
		// Calculer le décalage vertical (hauteur du node supprimé + espacement)
		const verticalGap = 150 // Espacement vertical standard
		
		// Remonter tous les nodes qui étaient en dessous
		nodesBelow.forEach(node => {
			const newY = node.position.y - verticalGap
			updateNode(node.id, {
				position: {
					x: node.position.x,
					y: newY
				}
			})
			console.log(`📍 Node ${node.id} remonté de Y=${node.position.y} à Y=${newY}`)
		})
		
		// Mettre à jour les internals
		const nodesToUpdate = nodesBelow.map(n => n.id)
		updateNodeInternals(nodesToUpdate)
	} else {
		// Si on a des nodes en aval directs, ajuster leur position Y pour qu'ils soient proches du node restauré
		console.log(`📊 ${directDownstream.length} nodes en aval direct trouvés`)
		
		// Position Y cible pour les nodes en aval (position du node restauré + espacement)
		const targetY = restoredNode.position.y + 150
		
		directDownstream.forEach(nodeId => {
			const downstreamNode = findNode(nodeId)
			if (downstreamNode && !downstreamNode.data?._temporaryLock) {
				const deltaY = downstreamNode.position.y - targetY
				
				// Si le node est trop loin, le rapprocher
				if (Math.abs(deltaY) > 50) {
					// Déplacer ce node et tous ses descendants
					const allDescendants = [nodeId, ...getDownstreamNodes(nodeId)]
					
					allDescendants.forEach(descendantId => {
						const descendant = findNode(descendantId)
						if (descendant && !descendant.data?._temporaryLock) {
							const newY = descendant.position.y - deltaY
							updateNode(descendantId, {
								position: {
									x: descendant.position.x,
									y: newY
								}
							})
							console.log(`📍 Node ${descendantId} ajusté de Y=${descendant.position.y} à Y=${newY}`)
						}
					})
				}
			}
		})
		
		// Mettre à jour les internals
		updateNodeInternals([restoredNodeId, ...directDownstream, ...getDownstreamNodes(restoredNodeId)])
	}
	
	await nextTick()
	
	// Forcer le rafraîchissement des edges
	triggerRef(edges)
}

// Fonction pour gérer la suppression d'une condition
async function handleConditionDelete(nodeId: string) {
	const conditionNode = findNode(nodeId)
	if (!conditionNode || conditionNode.type !== 'condition') return
	
	// Compter les branches et les éléments
	const branches = conditionNode.data.branches || []
	const branchInfo = branches.map(branch => {
		const branchEdges = edges.value.filter(e => e.source === nodeId && e.sourceHandle === branch.id)
		
		// Pour chaque branche, compter tous les éléments en aval
		let elementCount = 0
		const visited = new Set<string>()
		
		branchEdges.forEach(edge => {
			const queue = [edge.target]
			
			while (queue.length > 0) {
				const currentId = queue.shift()
				if (visited.has(currentId)) continue
				
				visited.add(currentId)
				elementCount++
				
				// Ajouter les nodes en aval
				edges.value
					.filter(e => e.source === currentId)
					.forEach(e => queue.push(e.target))
			}
		})
		
		return {
			id: branch.id,
			label: branch.label,
			elementCount,
			firstNodeId: branchEdges[0]?.target
		}
	})
	
	const totalElements = branchInfo.reduce((sum, branch) => sum + branch.elementCount, 0)
	
	// Créer le message pour le dialogue
	const message = `Cette condition contient ${branches.length} branches avec ${totalElements} éléments au total.`
	
	// Créer les options
	const options = [
		{ label: 'Tout supprimer', value: 'delete-all' },
		...branchInfo.map(branch => ({
			label: `Garder les éléments de "${branch.label}" (${branch.elementCount} éléments)`,
			value: `keep-${branch.id}`
		})),
		{ label: 'Annuler', value: 'cancel' }
	]
	
	// Créer un dialogue personnalisé avec des radio buttons
	const selectedOption = ref('delete-all')
	
	dialog.create({
		title: 'Supprimer la condition',
		icon: () => h(Icon, { icon: 'mdi:alert', style: { color: '#f0a020' } }),
		content: () => {
			return h('div', { style: { padding: '10px 0' } }, [
				// Message avec icône warning
				h('div', { style: { 
					background: '#fff7e6',
					border: '1px solid #ffd591',
					borderRadius: '6px',
					padding: '12px 16px',
					marginBottom: '20px',
					display: 'flex',
					alignItems: 'center',
					gap: '10px'
				}}, [
					h(Icon, { 
						icon: 'mdi:information',
						style: { color: '#f0a020', fontSize: '20px' }
					}),
					h('span', { style: { color: '#663c00' } }, message)
				]),
				
				// Options avec style amélioré
				h(NRadioGroup, {
					value: selectedOption.value,
					'onUpdate:value': (value: string) => { selectedOption.value = value }
				}, {
					default: () => options.map(option => {
						// Déterminer l'icône et la couleur selon l'option
						let icon = 'mdi:delete'
						let color = '#d32f2f'
						let bgColor = '#ffebee'
						
						if (option.value === 'cancel') {
							icon = 'mdi:cancel'
							color = '#666'
							bgColor = '#f5f5f5'
						} else if (option.value.startsWith('keep-')) {
							icon = 'mdi:content-save'
							color = '#2e7d32'
							bgColor = '#e8f5e9'
						}
						
						return h('div', { 
							key: option.value,
							style: { marginBottom: '8px' }
						}, [
							h(NRadio, { 
								value: option.value,
								style: { width: '100%' }
							}, { 
								default: () => h('div', {
									style: {
										display: 'flex',
										alignItems: 'center',
										gap: '8px',
										padding: '8px 12px',
										background: selectedOption.value === option.value ? bgColor : 'transparent',
										borderRadius: '6px',
										transition: 'all 0.2s'
									}
								}, [
									h(Icon, { 
										icon: icon,
										style: { color: color, fontSize: '18px' }
									}),
									h('span', option.label)
								])
							})
						])
					})
				})
			])
		},
		positiveText: 'Confirmer',
		negativeText: 'Annuler',
		positiveButtonProps: {
			type: selectedOption.value === 'delete-all' ? 'error' : 'primary'
		},
		onPositiveClick: async () => {
			const selectedValue = selectedOption.value
			
			if (selectedValue === 'cancel') {
				return
			}
			
			if (selectedValue === 'delete-all') {
				await executeConditionDeletion(nodeId, 'delete-all', null)
			} else if (selectedValue.startsWith('keep-')) {
				const branchId = selectedValue.replace('keep-', '')
				await executeConditionDeletion(nodeId, 'keep-branch', branchId)
			}
		},
		onNegativeClick: () => {
			console.log('Suppression annulée')
		}
	})
}

// Fonction pour exécuter la suppression de condition selon l'option choisie
async function executeConditionDeletion(nodeId: string, action: string, branchToKeep: string | null) {
	const conditionNode = findNode(nodeId)
	if (!conditionNode) return
	
	console.log(`🗑️ Suppression de condition: ${action}`, branchToKeep)
	
	if (action === 'delete-all') {
		// Supprimer la condition et tous ses descendants
		const allDescendants = getDownstreamNodes(nodeId)
		
		// Supprimer tous les edges sortants
		const outgoingEdges = edges.value.filter(e => e.source === nodeId)
		removeEdges(outgoingEdges.map(e => e.id))
		
		// Supprimer tous les nodes descendants
		removeNodes(allDescendants)
		
		// Obtenir l'edge entrant vers la condition
		const incomingEdge = edges.value.find(e => e.target === nodeId)
		
		// Supprimer la condition elle-même
		removeNodes([nodeId])
		
		console.log(`✅ Suppression complète: ${allDescendants.length + 1} nodes supprimés`)
		
		// Si la condition avait un edge entrant, créer un node Fin à sa place
		if (incomingEdge) {
			const endNodeId = `${nodeId}-end`
			const endNodeWidth = 200
			
			// Calculer la position centrée pour le node Fin
			const sourceNode = findNode(incomingEdge.source)
			if (sourceNode) {
				const sourceWidth = sourceNode.dimensions?.width || getNodeDefaultWidth(sourceNode.type)
				const sourceCenter = sourceNode.position.x + sourceWidth / 2
				const endNodeX = sourceCenter - endNodeWidth / 2
				
				// Créer le node Fin
				addNodes({
					id: endNodeId,
					type: 'end',
					position: {
						x: endNodeX,
						y: conditionNode.position.y
					},
					data: {
						label: 'Fin du questionnaire',
						message: 'Merci d\'avoir complété ce questionnaire !'
					}
				})
				
				// Créer l'edge avec le bouton +
				addEdges({
					id: `e-${incomingEdge.source}-${endNodeId}`,
					source: incomingEdge.source,
					target: endNodeId,
					type: 'add-node',
					animated: false
				})
				
				console.log('✅ Node Fin ajouté après suppression de condition')
			}
		}
		
	} else if (action === 'keep-branch' && branchToKeep) {
		// Garder seulement une branche
		const branchToKeepEdge = edges.value.find(e => 
			e.source === nodeId && e.sourceHandle === branchToKeep
		)
		
		if (!branchToKeepEdge) return
		
		// Obtenir le premier node de la branche à garder
		const firstNodeToKeep = branchToKeepEdge.target
		
		// Obtenir tous les nodes des autres branches
		const nodesToDelete = new Set<string>()
		edges.value
			.filter(e => e.source === nodeId && e.sourceHandle !== branchToKeep)
			.forEach(edge => {
				nodesToDelete.add(edge.target)
				getDownstreamNodes(edge.target).forEach(id => nodesToDelete.add(id))
			})
		
		// Supprimer les edges des autres branches
		const edgesToDelete = edges.value.filter(e => 
			(e.source === nodeId && e.sourceHandle !== branchToKeep) ||
			nodesToDelete.has(e.source) ||
			nodesToDelete.has(e.target)
		)
		removeEdges(edgesToDelete.map(e => e.id))
		
		// Supprimer les nodes des autres branches
		removeNodes(Array.from(nodesToDelete))
		
		// Reconnecter le node précédent directement au premier node de la branche gardée
		const incomingEdge = edges.value.find(e => e.target === nodeId)
		if (incomingEdge && firstNodeToKeep) {
			// Supprimer l'edge vers la condition
			removeEdges([incomingEdge.id])
			
			// Supprimer l'edge de la condition vers le premier node
			removeEdges([branchToKeepEdge.id])
			
			// Créer un nouvel edge direct
			addEdges({
				id: `e-${incomingEdge.source}-${firstNodeToKeep}`,
				source: incomingEdge.source,
				target: firstNodeToKeep,
				type: 'add-node'
			})
			
			// Positionner le premier node à la place de la condition
			const firstNode = findNode(firstNodeToKeep)
			if (firstNode) {
				updateNode(firstNodeToKeep, {
					position: { ...conditionNode.position }
				})
				
				// Ajuster tous les nodes en aval
				await adjustVerticalPositionsAfterDeletion(conditionNode.position, firstNodeToKeep, null)
				
				// Vérifier si la branche gardée se termine par un node Fin
				const downstreamNodes = getDownstreamNodes(firstNodeToKeep)
				downstreamNodes.push(firstNodeToKeep) // Inclure le premier node aussi
				
				// Chercher un node sans edge sortant (fin de chaîne)
				let hasEndNode = false
				let lastNodeInChain = null
				
				for (const nodeId of downstreamNodes) {
					const node = findNode(nodeId)
					if (node && node.type === 'end') {
						hasEndNode = true
						break
					}
					
					// Chercher le dernier node de la chaîne (sans edge sortant)
					const hasOutgoingEdge = edges.value.some(e => e.source === nodeId)
					if (!hasOutgoingEdge) {
						lastNodeInChain = nodeId
					}
				}
				
				// Si pas de node Fin et qu'on a trouvé le dernier node, en ajouter un
				if (!hasEndNode && lastNodeInChain) {
					const lastNode = findNode(lastNodeInChain)
					if (lastNode) {
						const endNodeId = `${lastNodeInChain}-end`
						const endNodeWidth = 200
						
						// Calculer la position centrée pour le node Fin
						const lastNodeWidth = lastNode.dimensions?.width || getNodeDefaultWidth(lastNode.type)
						const lastNodeCenter = lastNode.position.x + lastNodeWidth / 2
						const endNodeX = lastNodeCenter - endNodeWidth / 2
						
						// Créer le node Fin
						addNodes({
							id: endNodeId,
							type: 'end',
							position: {
								x: endNodeX,
								y: lastNode.position.y + 150
							},
							data: {
								label: 'Fin du questionnaire',
								message: 'Merci d\'avoir complété ce questionnaire !'
							}
						})
						
						// Attendre que le node Fin soit créé
						await nextTick()
						
						// Créer l'edge avec le bouton +
						addEdges({
							id: `e-${lastNodeInChain}-${endNodeId}`,
							source: lastNodeInChain,
							target: endNodeId,
							type: 'add-node',
							animated: false
						})
						
						console.log('✅ Node Fin ajouté à la fin de la branche conservée')
					}
				} else if (hasEndNode) {
					// Si on a déjà un node Fin, vérifier que l'edge existe et la recréer si nécessaire
					console.log('🔍 Vérification de l\'edge vers le node Fin existant')
					
					// Trouver le node Fin
					let endNodeId = null
					for (const nodeId of downstreamNodes) {
						const node = findNode(nodeId)
						if (node && node.type === 'end') {
							endNodeId = nodeId
							break
						}
					}
					
					if (endNodeId && lastNodeInChain) {
						// Vérifier si l'edge existe
						const existingEdge = edges.value.find(e => 
							e.source === lastNodeInChain && e.target === endNodeId
						)
						
						if (!existingEdge) {
							console.log('⚠️ Edge manquante vers le node Fin, recréation...')
							
							// Supprimer toute edge sortante du dernier node
							const outgoingEdges = edges.value.filter(e => e.source === lastNodeInChain)
							if (outgoingEdges.length > 0) {
								removeEdges(outgoingEdges.map(e => e.id))
							}
							
							// Recréer l'edge
							addEdges({
								id: `e-${lastNodeInChain}-${endNodeId}`,
								source: lastNodeInChain,
								target: endNodeId,
								type: 'add-node',
								animated: false
							})
							
							console.log('✅ Edge recréée vers le node Fin')
						}
					}
				}
			}
		}
		
		// Attendre que VueFlow traite les suppressions
		await nextTick()
		
		// Supprimer la condition APRÈS avoir fait toutes les préparations
		removeNodes([nodeId])
		
		console.log(`✅ Branche "${branchToKeep}" conservée, autres branches supprimées`)
		
		// Attendre que la suppression soit effective
		await nextTick()
		
		// Si on a un premier node à garder, le traiter immédiatement
		if (firstNodeToKeep) {
			// Collecter tous les nodes affectés
			const allAffectedNodes = [firstNodeToKeep, ...getDownstreamNodes(firstNodeToKeep)]
			
			// Forcer la mise à jour des positions pour déclencher le recalcul des handles
			for (const affectedNodeId of allAffectedNodes) {
				const node = findNode(affectedNodeId)
				if (node) {
					// Micro-déplacement pour forcer le recalcul
					updateNode(affectedNodeId, {
						position: {
							x: node.position.x + 0.01,
							y: node.position.y
						}
					})
				}
			}
			
			await nextTick()
			
			// Remettre les positions exactes
			for (const affectedNodeId of allAffectedNodes) {
				const node = findNode(affectedNodeId)
				if (node) {
					updateNode(affectedNodeId, {
						position: {
							x: node.position.x - 0.01,
							y: node.position.y
						}
					})
				}
			}
			
			await nextTick()
			
			// Mettre à jour les internals de tous les nodes affectés
			updateNodeInternals(allAffectedNodes)
			
			// Attendre un peu pour que les handles soient bien initialisés
			await new Promise(resolve => setTimeout(resolve, 100))
			
			// Utiliser la nouvelle fonction pour recréer les edges
			await recreateEdgesForNodes(allAffectedNodes)
			
			// Réaligner le workflow après un court délai
			setTimeout(async () => {
				await realignDownstreamWorkflow(firstNodeToKeep)
				
				// Forcer une dernière mise à jour complète
				await forceUpdateAllConnections()
				
				// Déclencher le layout seulement si tous les nodes sont initialisés
				const allNodesReady = allAffectedNodes.every(id => {
					const node = findNode(id)
					return node && node.dimensions && node.dimensions.width > 0
				})
				
				if (allNodesReady) {
					layoutGraph()
				} else {
					console.log('⏳ Certains nodes ne sont pas prêts, report du layout')
				}
			}, 200)
		}
	}
	
	// Forcer la mise à jour du layout après toutes les autres opérations
	setTimeout(() => {
		// Vérifier que tous les nodes sont bien initialisés avant le layout
		const allNodesInitialized = nodes.value.every(node => findNode(node.id))
		if (allNodesInitialized) {
			layoutGraph()
		} else {
			console.log('⏳ Layout reporté car nodes non initialisés')
			// Réessayer après un délai
			setTimeout(() => layoutGraph(), 500)
		}
	}, 600) // Délai augmenté pour s'assurer que tout est prêt
}

// Fonction pour aligner les nodes avec un node "Ajouter un élément"
async function alignNodesWithAddElement(addElementId: string) {
	const addElementNode = findNode(addElementId)
	if (!addElementNode) return
	
	// Trouver tous les edges qui pointent vers ce node
	const incomingEdges = edges.value.filter(e => e.target === addElementId)
	
	if (incomingEdges.length === 0) return
	
	// Si un seul edge entrant, aligner verticalement avec le node source
	if (incomingEdges.length === 1) {
		const sourceNode = findNode(incomingEdges[0].source)
		if (sourceNode) {
			// Calculer la position X pour centrer avec le node source
			const sourceWidth = sourceNode.dimensions?.width || getNodeDefaultWidth(sourceNode.type)
			const sourceCenter = sourceNode.position.x + sourceWidth / 2
			const addElementWidth = addElementNode.dimensions?.width || getNodeDefaultWidth('add-element')
			const newX = sourceCenter - addElementWidth / 2
			
			updateNode(addElementId, {
				position: {
					x: newX,
					y: addElementNode.position.y
				}
			})
			
			// Réaligner tout le workflow en aval
			await realignDownstreamWorkflow(addElementId)
		}
	} else if (incomingEdges.length > 1) {
		// Si plusieurs edges entrants, centrer entre tous les nodes sources
		const sourceNodes = incomingEdges.map(edge => findNode(edge.source)).filter(Boolean)
		
		if (sourceNodes.length > 0) {
			// Calculer la position X moyenne des nodes sources
			const avgX = sourceNodes.reduce((sum, node) => {
				const nodeWidth = node.dimensions?.width || getNodeDefaultWidth(node.type)
				return sum + node.position.x + nodeWidth / 2
			}, 0) / sourceNodes.length
			
			const addElementWidth = addElementNode.dimensions?.width || getNodeDefaultWidth('add-element')
			const newX = avgX - addElementWidth / 2
			
			updateNode(addElementId, {
				position: {
					x: newX,
					y: addElementNode.position.y
				}
			})
			
			// Réaligner tout le workflow en aval
			await realignDownstreamWorkflow(addElementId)
		}
	}
}

// Utiliser shallowRef pour de meilleures performances
const nodes = shallowRef<Node[]>([])  // Initialiser vide pour lazy loading

// Les données seront chargées de façon asynchrone
const loadInitialData = async () => {
	const { initialNodes, initialEdges } = await getInitialData()
	nodes.value = initialNodes
	triggerRef(nodes)
	// Corriger les edges de condition au chargement
	edges.value = fixConditionEdges(initialEdges, initialNodes)
	triggerRef(edges)
	
	// Layout après chargement des données
	await nextTick()
	layoutAndFitGraph()
}

const edges = shallowRef<Edge[]>([])  // Initialiser vide pour lazy loading
const isDragging = ref(false)

// Créer une version debouncée de layoutGraph pour éviter les appels multiples
let layoutGraphDebounced: ReturnType<typeof debounce>

// État de chargement
const isLoading = ref(true)

// Gestionnaires d'événements pour les nodes
const handleNodeEdit = (nodeId: string) => {
	console.log('📝 EDIT NODE DEMANDÉ:', nodeId)
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
			console.log('🔧 OUVERTURE MODAL CONDITION pour:', nodeId)
			showConditionModal.value = true
			break
	}
}

const handleNodeDelete = async (nodeId: string) => {
	const node = findNode(nodeId)
	if (!node) return
	
	// Si c'est une condition, afficher le dialogue de confirmation
	if (node.type === 'condition') {
		await handleConditionDelete(nodeId)
		return
	}
	
	// Reconnecter les edges - MÉTHODE DIRECTE plus fiable
	console.log('🔍 DEBUG - Node à supprimer:', nodeId, node)
	console.log('🔍 DEBUG - Tous les edges:', edges.value.map(e => ({id: e.id, source: e.source, target: e.target})))
	
	// Recherche directe dans edges.value au lieu d'utiliser getConnectedEdges
	const incomingEdge = edges.value.find(edge => edge.target === nodeId)
	const outgoingEdge = edges.value.find(edge => edge.source === nodeId)
	
	console.log('🔍 DEBUG - Edge entrant (recherche directe):', incomingEdge)
	console.log('🔍 DEBUG - Edge sortant (recherche directe):', outgoingEdge)
	
	// Vérifier si ce node a été créé depuis un node "Ajouter un élément"
	if (node.data?.createdFromAddElement) {
		// ACTIVER le mode restauration pour bloquer l'auto-layout
		isRestoring = true
		console.log('🚫 MODE RESTAURATION ACTIVÉ - Auto-layout temporairement désactivé')
		
		const addElementInfo = node.data.createdFromAddElement
		console.log('🔄 RESTAURATION - Début de la restauration:', addElementInfo)
		console.log('📍 RESTAURATION - Position du node à supprimer:', {
			x: node.position.x,
			y: node.position.y,
			fullPosition: node.position
		})
		console.log('📍 RESTAURATION - Position originale sauvegardée:', addElementInfo.originalPosition)
		console.log('📍 RESTAURATION - Position qui sera utilisée:', addElementInfo.originalPosition || node.position)
		
		// Sauvegarder les positions actuelles de TOUS les nodes pour les restaurer après
		const currentPositions = new Map()
		nodes.value.forEach(n => {
			currentPositions.set(n.id, { ...n.position })
		})
		
		// IMPORTANT: Sauvegarder l'edge sortant ACTUEL (pas celui sauvé lors du remplacement)
		let currentOutgoingEdge = null
		let shouldKeepTarget = false
		let targetNodeInfo = null
		
		if (outgoingEdge) {
			currentOutgoingEdge = { ...outgoingEdge }
			const targetNode = findNode(outgoingEdge.target)
			
			if (targetNode) {
				// Sauvegarder les infos du node cible
				targetNodeInfo = {
					id: targetNode.id,
					type: targetNode.type,
					position: { ...targetNode.position },
					data: { ...targetNode.data }
				}
				
				// Toujours garder le node cible, qu'il soit "end" ou autre
				shouldKeepTarget = true
			}
			
			removeEdges([outgoingEdge])
			
			// Ne jamais supprimer automatiquement le node cible
			// Laissons l'utilisateur décider s'il veut garder le node "fin" ou non
		}
		
		// Recréer le node "Ajouter un élément" AVANT de supprimer le node actuel
		const addElementId = addElementInfo.nodeId || `${nodeId}-add-element`
		
		// UTILISER les edges sauvés depuis le remplacement (plus fiable que la recherche actuelle)
		const savedIncomingEdge = addElementInfo.savedIncomingEdge || (incomingEdge ? { ...incomingEdge } : null)
		const savedOutgoingEdge = addElementInfo.savedOutgoingEdge || (outgoingEdge ? { ...outgoingEdge } : null)
		console.log('💾 Edge entrant (depuis sauvegarde du remplacement):', savedIncomingEdge)
		console.log('💾 Edge sortant (depuis sauvegarde du remplacement):', savedOutgoingEdge)
		
		// Supprimer l'ancien edge d'abord
		if (incomingEdge) {
			removeEdges([incomingEdge])
		}
		
		// IMPORTANT: Utiliser la position ACTUELLE du node supprimé, pas la position originale
		// Cela garantit que le node "Créer un élément" reprend exactement la place du node supprimé
		const restoredPosition = { ...node.position } // Toujours utiliser la position actuelle
		console.log('✨ RESTAURATION - Position du node supprimé qui sera utilisée:', restoredPosition)
		console.log('📍 Position originale (ignorée):', addElementInfo.originalPosition)
		
		addNodes({
			id: addElementId,
			type: 'add-element',
			position: restoredPosition,
			data: {
				conditionBranch: addElementInfo.conditionBranch,
				branchLabel: addElementInfo.branchLabel,
				isGhost: true,
				_restoredFromOriginal: true, // Marquer pour éviter le repositionnement
				_originalPosition: restoredPosition, // Sauvegarder la position cible
				_lockedPosition: true // Marquer pour empêcher tout déplacement automatique
			}
		})
		
		console.log('✅ RESTAURATION - Node ajouté avec la position:', restoredPosition)
		
		// TRAQUER le repositionnement mystérieux
		const checkPosition = () => {
			const currentNode = findNode(addElementId)
			if (currentNode) {
				console.log('🕵️ TRACKING - Position actuelle du node:', currentNode.position)
				if (currentNode.position.x !== restoredPosition.x || currentNode.position.y !== restoredPosition.y) {
					console.log('⚠️ MYSTÈRE - Le node a bougé de', restoredPosition, 'vers', currentNode.position)
				}
			}
		}
		
		// PROTECTION AGRESSIVE: Forcer la position en continu
		const forcePosition = () => {
			const currentNode = findNode(addElementId)
			if (currentNode) {
				if (currentNode.position.x !== restoredPosition.x || currentNode.position.y !== restoredPosition.y) {
					console.log('🚨 FORCE CORRECTION - Repositionnement détecté, correction immédiate!')
					updateNode(addElementId, { position: restoredPosition })
				}
			}
		}
		
		// Vérifier et corriger la position toutes les 10ms pendant 500ms
		for (let i = 1; i <= 50; i++) {
			setTimeout(() => {
				checkPosition()
				forcePosition()
			}, i * 10)
		}
		
		// Supprimer le node original
		removeNodes([node])
		
		// Utiliser nextTick et un délai pour s'assurer que VueFlow a traité les changements
		nextTick(() => {
			setTimeout(async () => {
				console.log('📌 Creating edge after delay, saved edge:', savedIncomingEdge)
				
				if (savedIncomingEdge && addElementInfo.conditionBranch) {
					// Créer directement le nouvel edge avec les bonnes infos
					const newEdge = {
						id: `e-${savedIncomingEdge.source}-${addElementInfo.conditionBranch}-${addElementId}`,
						source: savedIncomingEdge.source,
						sourceHandle: addElementInfo.conditionBranch,
						target: addElementId,
						type: 'simple-condition',
						label: addElementInfo.branchLabel || savedIncomingEdge.label,
						animated: true
					}
					console.log('✨ Creating new edge:', newEdge)
					
					// Ajouter le nouveau edge
					addEdges(newEdge)
				} else if (savedIncomingEdge) {
					console.log('⚠️ No conditionBranch info, using existing edge')
					// Fallback si pas d'info de branche
					addEdges({
						...savedIncomingEdge,
						id: savedIncomingEdge.id,
						target: addElementId,
						type: savedIncomingEdge.type || 'simple-condition',
						animated: true
					})
				} else {
					console.log('❌ No incoming edge found!')
				}
				
				// Vérifier si on restaure depuis une branche de condition
				const isFromConditionBranch = addElementInfo.conditionBranch !== undefined && addElementInfo.conditionBranch !== null
				console.log('🔍 Restauration depuis branche de condition?', isFromConditionBranch, addElementInfo.conditionBranch)
				
				// RESTAURER l'edge sortant - Utiliser l'edge ACTUEL, pas celui sauvé
				// SAUF si on vient d'une branche de condition, dans ce cas on veut toujours un node "fin"
				if (!isFromConditionBranch && currentOutgoingEdge && shouldKeepTarget && targetNodeInfo) {
					// Vérifier que le node cible existe toujours
					const targetStillExists = findNode(currentOutgoingEdge.target)
					
					if (targetStillExists) {
						// Utiliser l'edge sortant actuel du node dynamique qui va être supprimé
						console.log('✨ Restauration de l\'edge sortant ACTUEL vers:', currentOutgoingEdge.target)
						const restoredOutgoingEdge = {
							id: `e-${addElementId}-${currentOutgoingEdge.target}`,
							source: addElementId,
							target: currentOutgoingEdge.target,
							type: 'add-node', // IMPORTANT: Toujours utiliser add-node pour avoir le bouton +
							animated: false
						}
						addEdges(restoredOutgoingEdge)
						console.log('✅ Edge sortant actuel restauré avec bouton +:', restoredOutgoingEdge)
						
						// Si c'est un node "fin", s'assurer qu'il est bien positionné
						if (targetNodeInfo.type === 'end') {
							await nextTick()
							updateNodeInternals([currentOutgoingEdge.target])
						}
					} else {
						console.log('⚠️ Le node cible n\'existe plus, il sera recréé si nécessaire')
					}
				} else if (!isFromConditionBranch && savedOutgoingEdge && savedOutgoingEdge.target) {
					// Fallback: utiliser l'edge sauvé si pas d'edge actuel
					const targetExists = findNode(savedOutgoingEdge.target)
					if (targetExists) {
						console.log('✨ Restauration de l\'edge sortant sauvé:', savedOutgoingEdge)
						const restoredOutgoingEdge = {
							...savedOutgoingEdge,
							id: `e-${addElementId}-${savedOutgoingEdge.target}`,
							source: addElementId,
							target: savedOutgoingEdge.target,
							type: 'add-node', // IMPORTANT: Toujours utiliser add-node pour avoir le bouton +
							animated: false
						}
						addEdges(restoredOutgoingEdge)
						console.log('✅ Edge sortant sauvé restauré:', restoredOutgoingEdge)
					} else {
						console.log('⚠️ Node cible n\'existe plus, création d\'un nouveau node Fin')
						// Créer un nouveau node Fin
						const newEndId = `${addElementId}-end`
						
						// Attendre que le node AddElement soit complètement initialisé
						await nextTick()
						updateNodeInternals([addElementId])
						await nextTick()
						
						// Récupérer le node avec ses dimensions réelles
						const addElementNode = findNode(addElementId)
						let nodeWidth = 240 // Largeur par défaut du AddElementNode
						if (addElementNode?.dimensions?.width) {
							nodeWidth = addElementNode.dimensions.width
						}
						
						// Utiliser les mêmes largeurs que dans les data initiales
						const endNodeWidth = 200
						
						// Calculer la position exacte pour centrer le node End
						const centerX = restoredPosition.x + (nodeWidth / 2) - (endNodeWidth / 2)
						
						console.log('📍 Calcul position node Fin:', {
							addElementX: restoredPosition.x,
							nodeWidth: nodeWidth,
							endNodeWidth: endNodeWidth,
							centerX: centerX
						})
						
						addNodes({
							id: newEndId,
							type: 'end',
							position: {
								x: centerX,
								y: restoredPosition.y + 150
							},
							data: {
								label: 'Fin du questionnaire',
								message: 'Merci d\'avoir complété ce questionnaire !'
							}
						})
						
						// Attendre et mettre à jour les internals du node Fin
						await nextTick()
						updateNodeInternals([newEndId])
						
						// Créer l'edge vers le nouveau node Fin
						addEdges({
							id: `e-${addElementId}-${newEndId}`,
							source: addElementId,
							target: newEndId,
							type: 'add-node',
							animated: false
						})
					}
				} else {
					console.log('ℹ️ Création d\'un nouveau node Fin', isFromConditionBranch ? '(depuis branche de condition)' : '(pas d\'edge sortant)')
					// Toujours créer un node Fin pour un node "Créer un élément" qui vient d'une branche de condition
					// OU quand il n'y a pas d'edge sortant
					const newEndId = `${addElementId}-end`
					// Attendre que le node AddElement soit complètement initialisé
					await nextTick()
					updateNodeInternals([addElementId])
					await nextTick()
					
					// Récupérer le node avec ses dimensions réelles
					const addElementNode = findNode(addElementId)
					let nodeWidth = 240 // Largeur par défaut du AddElementNode
					if (addElementNode?.dimensions?.width) {
						nodeWidth = addElementNode.dimensions.width
					}
					
					// Utiliser les mêmes largeurs que dans les data initiales
					const endNodeWidth = 200
					
					// Calculer la position exacte pour centrer le node End
					const centerX = restoredPosition.x + (nodeWidth / 2) - (endNodeWidth / 2)
					
					console.log('📍 Calcul position node Fin (cas 2):', {
						addElementX: restoredPosition.x,
						nodeWidth: nodeWidth,
						endNodeWidth: endNodeWidth,
						centerX: centerX
					})
					
					addNodes({
						id: newEndId,
						type: 'end',
						position: {
							x: centerX,
							y: restoredPosition.y + 150
						},
						data: {
							label: 'Fin du questionnaire',
							message: 'Merci d\'avoir complété ce questionnaire !'
						}
					})
					
					// Attendre et mettre à jour les internals du node Fin
					await nextTick()
					updateNodeInternals([newEndId])
					
					// Créer l'edge vers le nouveau node Fin
					addEdges({
						id: `e-${addElementId}-${newEndId}`,
						source: addElementId,
						target: newEndId,
						type: 'add-node',
						animated: false
					})
				}
				
				// Mettre à jour les internals pour s'assurer que les handles sont connectés
				const nodesToUpdate = [addElementId]
				
				// Ajouter TOUS les nodes connectés pour forcer la mise à jour des edges
				if (currentOutgoingEdge && shouldKeepTarget) {
					nodesToUpdate.push(currentOutgoingEdge.target)
				}
				
				// Si on a créé un nouveau node Fin, mettre à jour ses internals aussi
				const newEndNode = nodes.value.find(n => n.id === `${addElementId}-end`)
				if (newEndNode) {
					nodesToUpdate.push(newEndNode.id)
				}
				
				// Mettre à jour tous les internals
				updateNodeInternals(nodesToUpdate)
				
				// Forcer un rafraîchissement des edges après un court délai
				await nextTick()
				setTimeout(() => {
					// Re-mettre à jour les internals pour forcer le redessin des edges
					updateNodeInternals(nodesToUpdate)
					// Trigger un rafraîchissement des edges
					triggerRef(edges)
				}, 50)
				
				// NE PAS relancer le layout pendant la restauration
				console.log('⏸️ Layout automatique suspendu pendant la restauration')
				
				// Utiliser la position actuelle du node, pas la position originale
				const targetPosition = { ...restoredPosition }
				
				// Restaurer les positions de tous les nodes
				currentPositions.forEach((position, nodeId) => {
					if (nodeId !== node.id && findNode(nodeId)) {
						updateNode(nodeId, { position })
					}
				})
				
				// S'assurer que le node "Ajouter un élément" est à la bonne position
				updateNode(addElementId, { position: targetPosition })
				
				// Attendre un peu pour que les nodes soient bien positionnés
				setTimeout(async () => {
					// NE PAS aligner si c'est une branche de condition - garder les positions existantes
					// On vérifie si le node a été créé depuis une branche de condition
					const isFromConditionBranch = addElementInfo.conditionBranch && savedIncomingEdge?.sourceHandle
					
					if (!isFromConditionBranch) {
						// Aligner seulement si ce n'est PAS une branche de condition
						await alignNodesWithAddElement(addElementId)
					} else {
						console.log('⚠️ Branche de condition détectée - Préservation des positions existantes')
						// Pour une branche de condition, on garde les positions telles quelles
						// et on verrouille temporairement TOUS les nodes des autres branches
						
						// Trouver le node condition source
						const conditionNode = findNode(savedIncomingEdge.source)
						if (conditionNode && conditionNode.type === 'condition') {
							// Trouver tous les nodes des autres branches
							const otherBranchNodes = new Set<string>()
							
							// Parcourir toutes les branches de la condition
							edges.value
								.filter(e => e.source === conditionNode.id && e.sourceHandle && e.sourceHandle !== addElementInfo.conditionBranch)
								.forEach(branchEdge => {
									// Ajouter le node direct et tous ses descendants
									otherBranchNodes.add(branchEdge.target)
									const downstream = getDownstreamNodes(branchEdge.target)
									downstream.forEach(id => otherBranchNodes.add(id))
								})
							
							// Verrouiller temporairement les positions de ces nodes
							otherBranchNodes.forEach(nodeId => {
								const node = findNode(nodeId)
								if (node) {
									updateNode(nodeId, {
										data: {
											...node.data,
											_temporaryLock: true
										}
									})
								}
							})
							
							console.log(`🔒 ${otherBranchNodes.size} nodes des autres branches verrouillés temporairement`)
						}
					}
					
					// Forcer une mise à jour immédiate des edges après l'alignement
					const connectedNodes = [addElementId]
					if (currentOutgoingEdge && shouldKeepTarget) {
						connectedNodes.push(currentOutgoingEdge.target)
					}
					updateNodeInternals(connectedNodes)
					await nextTick()
					
					// Forcer le rafraîchissement des edges
					edges.value = [...edges.value]
					triggerRef(edges)
					
					// Ajuster les positions verticales IMMÉDIATEMENT
					const targetNodeId = currentOutgoingEdge?.target || null
					if (targetNodeId) {
						console.log('🎯 Ajustement immédiat du node cible:', targetNodeId)
						await adjustVerticalPositionsAfterDeletion(node.position, addElementId, targetNodeId)
					}
					
					// DÉSACTIVER le mode restauration après 500ms
					setTimeout(async () => {
						isRestoring = false
						console.log('✅ MODE RESTAURATION DÉSACTIVÉ - Auto-layout réactivé')
						
						// Retirer le flag de position verrouillée maintenant que la restauration est terminée
						const addElementNode = findNode(addElementId)
						if (addElementNode && addElementNode.data._lockedPosition) {
							updateNode(addElementId, { 
								data: { 
									...addElementNode.data, 
									_lockedPosition: false,
									_restoredFromOriginal: false 
								} 
							})
							console.log('🔓 Position déverrouillée pour le node:', addElementId)
						}
						
						// Retirer les verrous temporaires de tous les nodes
						nodes.value.forEach(node => {
							if (node.data?._temporaryLock) {
								updateNode(node.id, {
									data: {
										...node.data,
										_temporaryLock: false
									}
								})
							}
						})
						console.log('🔓 Tous les verrous temporaires retirés')
						
						// Forcer la mise à jour de toutes les connexions pour garantir l'alignement
						await forceUpdateAllConnections()
						console.log('🔄 Mise à jour forcée de toutes les connexions')
						
						// Vérifier spécifiquement que le node "Ajouter un élément" a bien une connexion
						const addElementOutgoingEdge = edges.value.find(e => e.source === addElementId)
						if (!addElementOutgoingEdge) {
							console.log('⚠️ Le node "Ajouter un élément" n\'a pas de connexion sortante')
							
							// Chercher un node "fin" existant en dessous
							const endNodes = nodes.value.filter(n => 
								n.type === 'end' && 
								n.position.y > restoredPosition.y &&
								n.position.y < restoredPosition.y + 300
							)
							
							if (endNodes.length > 0) {
								// Connecter au node "fin" le plus proche
								const closestEnd = endNodes.reduce((closest, current) => {
									const closestDist = Math.abs(closest.position.y - restoredPosition.y)
									const currentDist = Math.abs(current.position.y - restoredPosition.y)
									return currentDist < closestDist ? current : closest
								})
								
								console.log('🔗 Connexion au node "fin" existant:', closestEnd.id)
								addEdges({
									id: `e-${addElementId}-${closestEnd.id}`,
									source: addElementId,
									target: closestEnd.id,
									type: 'add-node',
									animated: false
								})
								
								await nextTick()
								updateNodeInternals([addElementId, closestEnd.id])
							} else {
								// Créer un nouveau node "fin"
								console.log('📍 Création d\'un nouveau node "fin"')
								const newEndId = `${addElementId}-end`
								const addElementNode = findNode(addElementId)
								const nodeWidth = addElementNode?.dimensions?.width || 240
								const endNodeWidth = 200
								const centerX = restoredPosition.x + (nodeWidth / 2) - (endNodeWidth / 2)
								
								addNodes({
									id: newEndId,
									type: 'end',
									position: {
										x: centerX,
										y: restoredPosition.y + 150
									},
									data: {
										label: 'Fin du questionnaire',
										message: 'Merci d\'avoir complété ce questionnaire !'
									}
								})
								
								await nextTick()
								updateNodeInternals([newEndId])
								
								addEdges({
									id: `e-${addElementId}-${newEndId}`,
									source: addElementId,
									target: newEndId,
									type: 'add-node',
									animated: false
								})
							}
						}
						
						// Si pas de node cible spécifique, chercher les nodes en dessous
						if (!targetNodeId) {
							await adjustVerticalPositionsAfterDeletion(node.position, addElementId, null)
						}
						
						// Déclencher un layout après un court délai pour finaliser
						setTimeout(() => {
							if (!isRestoring) {
								layoutGraph()
							}
						}, 100)
					}, 500)
				}, 200)
			}, 100) // Délai de 100ms pour laisser VueFlow traiter les changements
		})
		
		return // Important: sortir ici pour ne pas exécuter le reste
	}
	// Vérifier si ce node est connecté à une condition via sourceHandle
	else if (incomingEdge && incomingEdge.sourceHandle) {
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
			
			// Si il y avait un edge sortant, le supprimer mais garder la référence du node cible
			let targetNodeForAdjustment = null
			if (outgoingEdge) {
				targetNodeForAdjustment = outgoingEdge.target
				removeEdges([outgoingEdge])
				
				// Ajuster immédiatement la position du node cible
				if (targetNodeForAdjustment) {
					setTimeout(async () => {
						console.log('🎯 Ajustement du node cible après suppression depuis condition:', targetNodeForAdjustment)
						await adjustVerticalPositionsAfterDeletion(node.position, addElementId, targetNodeForAdjustment)
						
						// Forcer la mise à jour
						await forceUpdateAllConnections()
					}, 100)
				}
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
	
	// Forcer un layout après la suppression pour réorganiser le workflow
	setTimeout(() => {
		console.log('🔄 Déclenchement du layout après suppression')
		layoutGraph()
	}, 200)
}

// Gestionnaire pour le remplacement du node "Ajouter un élément"
const handleAddElementReplaced = async (event: any) => {
	console.log('Node replaced event:', event)
	
	// Retirer l'animation de l'edge
	const edge = edges.value.find(e => e.target === event.newNodeId)
	if (edge) {
		updateEdge(edge.id, { animated: false })
	}
	
	// Forcer une mise à jour complète après le remplacement
	await nextTick()
	
	// S'assurer que le nouveau node est bien dans la liste
	const verifiedNode = nodes.value.find(n => n.id === event.newNodeId)
	if (verifiedNode) {
		console.log('New node found:', verifiedNode)
		// Mettre à jour les internals pour s'assurer que les handles sont bien configurés
		updateNodeInternals([event.newNodeId])
	} else {
		console.log('WARNING: New node not found in nodes list!')
	}
	
	// Forcer le rafraîchissement
	triggerRef(nodes)
	triggerRef(edges)
	
	// Attendre un peu plus et vérifier à nouveau
	const timeoutId = setTimeout(async () => {
		console.log('Nodes after replacement delay:', nodes.value.map(n => ({ id: n.id, type: n.type })))
		updateNodeInternals([event.newNodeId])
		
		// Réaligner tout le workflow en aval du nouveau node
		await realignDownstreamWorkflow(event.newNodeId)
		
		// Forcer la mise à jour complète des connexions pour corriger l'alignement
		await forceUpdateAllConnections()
	}, 300)
	timeouts.add(timeoutId)
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
	console.log('\n🚨🚨🚨 DÉBUT handleConditionConfirm 🚨🚨🚨')
	if (!currentEditNode.value) return
	
	const nodeId = currentEditNode.value.id
	const conditionNode = nodes.value.find(n => n.id === nodeId)
	if (!conditionNode) return
	
	console.log('🔍 CONDITION NODE:', {
		id: nodeId,
		position: conditionNode.position,
		currentBranches: currentEditNode.value.data.branches?.length || 0,
		newBranches: data.branches?.length || 0
	})
	
	// DEBUG: État complet AVANT modification
	console.log('📊 ÉTAT AVANT MODIFICATION:')
	console.log('  - Tous les nodes:', nodes.value.map(n => ({ id: n.id, type: n.type, position: n.position })))
	console.log('  - Tous les edges:', edges.value.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle })))
	
	// Étape 1: Sauvegarder l'état actuel des connexions
	const existingConnections = new Map<string, { target: string, edge: Edge }>()
	edges.value.filter(edge => edge.source === nodeId).forEach(edge => {
		if (edge.sourceHandle) {
			existingConnections.set(edge.sourceHandle, { target: edge.target, edge })
		}
	})
	
	console.log('💾 CONNEXIONS EXISTANTES SAUVEGARDÉES:')
	existingConnections.forEach((connection, handle) => {
		const targetNode = nodes.value.find(n => n.id === connection.target)
		console.log(`  - Handle ${handle} → Node ${connection.target} (type: ${targetNode?.type})`)
	})
	
	// Étape 2: Supprimer TOUS les edges sortants AVANT de mettre à jour le node
	const edgesToRemove = edges.value.filter(edge => edge.source === nodeId)
	console.log('🗑️ SUPPRESSION EDGES SORTANTS:', edgesToRemove.map(e => ({ id: e.id, target: e.target })))
	if (edgesToRemove.length > 0) {
		removeEdges(edgesToRemove.map(e => e.id))
		await nextTick()
		console.log('✅ Edges supprimés, état actuel edges:', edges.value.filter(e => e.source === nodeId))
	}
	
	// Étape 3: Mettre à jour les données du node
	console.log('🔄 MISE À JOUR NODE DATA')
	updateNode(nodeId, { data: { ...currentEditNode.value.data, ...data } })
	
	// Étape 4: Forcer la mise à jour des handles internes du node
	await nextTick()
	console.log('🔧 MISE À JOUR HANDLES INTERNES')
	updateNodeInternals([nodeId])
	
	// Étape 5: Attendre que Vue Flow traite la mise à jour
	await nextTick()
	await new Promise(resolve => setTimeout(resolve, 150))
	console.log('⏳ ATTENTE TERMINÉE - État après mise à jour node:')
	
	// Étape 6: Créer les nouveaux nodes et préparer les edges
	const newNodes: Node[] = []
	const newEdges: Edge[] = []
	const nodesToUpdate: { id: string, position: { x: number, y: number } }[] = []
	
	// Calculer les positions pour TOUS les chemins (existants et nouveaux)
	const totalBranches = data.branches.length
	const spaceBetweenNodes = 200 // Espace entre les nodes
	
	// Centre du node condition
	const conditionCenterX = conditionNode.position.x + 100 // Le node condition fait 200px de large
	
	console.log('🔄 TRAITEMENT DES BRANCHES:')
	for (let i = 0; i < data.branches.length; i++) {
		const branch = data.branches[i]
		const existingConnection = existingConnections.get(branch.id)
		
		console.log(`\n📍 BRANCHE ${i + 1}/${data.branches.length}:`, {
			branchId: branch.id,
			branchLabel: branch.label,
			existingConnection: existingConnection ? {
				target: existingConnection.target,
				edgeId: existingConnection.edge.id
			} : null
		})
		
		// Calculer la position X pour centrer le groupe sous le node condition
		// Pour 2 branches: -100, 100 (écart de 200)
		// Pour 3 branches: -200, 0, 200 (écart de 200)
		// Pour 4 branches: -300, -100, 100, 300 (écart de 200)
		const offset = (i - (totalBranches - 1) / 2) * spaceBetweenNodes
		const newX = conditionCenterX + offset - 120 // -120 car le node add-element fait 240px de large (moitié = 120)
		const newY = conditionNode.position.y + 150
		
		console.log(`  💫 Position calculée: x=${newX}, y=${newY}`)
		
		// CORRECTION MAJEURE: Trouver le node réel (qui peut avoir été remplacé)
		let actualTargetNode = null
		let actualTargetId = null
		
		if (existingConnection) {
			console.log(`🔍 RECHERCHE NODE: ${existingConnection.target}`)
			
			// D'abord chercher par l'ID original
			actualTargetNode = nodes.value.find(n => n.id === existingConnection.target)
			actualTargetId = existingConnection.target
			
			console.log(`❓ Node trouvé directement:`, actualTargetNode ? 'OUI' : 'NON')
			if (actualTargetNode) {
				console.log(`   - Type: ${actualTargetNode.type}`)
				console.log(`   - Data:`, actualTargetNode.data)
				console.log(`🚨 ATTENTION: Node ghost trouvé alors qu'il devrait être remplacé !`)
			}
			
			// Si pas trouvé, chercher un node qui a remplacé l'original
			if (!actualTargetNode) {
				console.log(`🔄 Recherche par createdFromAddElement...`)
				console.log(`📊 Tous les nodes disponibles:`, nodes.value.map(n => ({
					id: n.id,
					type: n.type,
					createdFromAddElement: n.data?.createdFromAddElement?.nodeId
				})))
				
				actualTargetNode = nodes.value.find(n => 
					n.data?.createdFromAddElement?.nodeId === existingConnection.target
				)
				if (actualTargetNode) {
					actualTargetId = actualTargetNode.id
					console.log(`✅ Node de remplacement trouvé:`, actualTargetId, `(type: ${actualTargetNode.type})`)
				} else {
					console.log(`❌ Aucun node de remplacement trouvé pour:`, existingConnection.target)
				}
			}
		}
		
		if (actualTargetNode && actualTargetId) {
			// Node existant à repositionner
			console.log('🔄 CONDITION UPDATE - Repositionnement du node existant:', actualTargetId, actualTargetNode.type)
			
			// Protection spéciale pour les nodes remplacés : préserver leur position si elle était restaurée
			const shouldPreservePosition = actualTargetNode.data?._restoredFromOriginal && actualTargetNode.data?._originalPosition
			if (shouldPreservePosition) {
				console.log('🔒 PROTECTION - Node restauré détecté, préservation de la position originale')
				nodesToUpdate.push({
					id: actualTargetId,
					position: actualTargetNode.data._originalPosition
				})
			} else {
				nodesToUpdate.push({
					id: actualTargetId,
					position: { x: newX, y: newY }
				})
			}
			
			// Reconnecter avec le bon sourceHandle en utilisant l'ID réel
			const isTemporaryNode = actualTargetId.includes('ghost') || actualTargetId.includes('add-element')
			const isReplacedNode = actualTargetNode?.data?.createdFromAddElement !== undefined
			
			console.log('🔗 CONDITION UPDATE - Reconnexion edge:', {
				originalTarget: existingConnection.target,
				actualTarget: actualTargetId,
				isTemporary: isTemporaryNode,
				isReplaced: isReplacedNode,
				nodeType: actualTargetNode?.type
			})
			
			newEdges.push({
				id: `e-${nodeId}-${branch.id}-${actualTargetId}`,
				source: nodeId,
				sourceHandle: branch.id,
				target: actualTargetId, // Utiliser l'ID réel, pas l'ancien
				type: 'simple-condition',
				label: branch.label,
				animated: isTemporaryNode // Seulement animer les nodes temporaires
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
			
			// CORRECTION: Créer automatiquement un node "Fin" et l'edge vers ce node
			const endId = `${ghostId}-end`
			newNodes.push({
				id: endId,
				type: 'end',
				position: {
					x: newX,
					y: newY + 150 // Positionner le node "Fin" sous le node "Ajouter un élément"
				},
				data: {
					label: 'Fin du questionnaire',
					message: 'Merci d\'avoir complété ce questionnaire !'
				}
			})
			
			// Créer l'edge du node "Ajouter un élément" vers le node "Fin"
			newEdges.push({
				id: `e-${ghostId}-${endId}`,
				source: ghostId,
				target: endId,
				type: 'add-node',
				animated: false
			})
			
			console.log('✅ NOUVEAU CHEMIN - Node Fin ajouté:', endId)
		}
	}
	
	// Étape 7: Mettre à jour les positions des nodes existants
	for (const nodeUpdate of nodesToUpdate) {
		updateNode(nodeUpdate.id, { position: nodeUpdate.position })
	}
	
	// Étape 8: Ajouter les nouveaux nodes s'il y en a
	console.log('➕ AJOUT NOUVEAUX NODES:', newNodes.length)
	if (newNodes.length > 0) {
		console.log('  Nouveaux nodes:', newNodes.map(n => ({ id: n.id, type: n.type, position: n.position })))
		addNodes(newNodes)
		await nextTick()
	}
	
	// Étape 9: Forcer une nouvelle mise à jour des handles après l'ajout des nodes
	console.log('🔧 MISE À JOUR HANDLES FINAUX')
	updateNodeInternals([nodeId])
	await nextTick()
	await new Promise(resolve => setTimeout(resolve, 100))
	
	// Étape 10: Ajouter tous les nouveaux edges
	console.log('🔗 AJOUT NOUVEAUX EDGES:', newEdges.length)
	if (newEdges.length > 0) {
		console.log('  Nouveaux edges:', newEdges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle })))
		addEdges(newEdges)
	}
	
	// Étape 11: Forcer une dernière mise à jour pour s'assurer que tout est connecté
	await nextTick()
	updateNodeInternals([nodeId])
	
	// DEBUG FINAL: État après toutes les modifications
	console.log('📊 ÉTAT FINAL APRÈS MODIFICATION:')
	console.log('  - Tous les nodes:', nodes.value.map(n => ({ id: n.id, type: n.type, position: n.position })))
	console.log('  - Tous les edges:', edges.value.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle })))
	
	// Réorganiser le graphe et réaligner le workflow en aval
	setTimeout(async () => {
		console.log('🎨 DÉCLENCHEMENT LAYOUT GRAPH ET RÉALIGNEMENT')
		
		// Réaligner tout le workflow en aval de la condition
		await realignDownstreamWorkflow(nodeId)
		
		// Puis faire le layout général
		layoutGraph()
	}, 200)
	
	currentEditNode.value = null
	console.log('🚨🚨🚨 FIN handleConditionConfirm 🚨🚨🚨\n')
}

// Gérer les connexions manuelles
const handleConnect = async (params: any) => {
	console.log('\n=== DÉBUT CONNEXION ===')
	console.log('🔗 Paramètres de connexion:', {
		source: params.source,
		sourceHandle: params.sourceHandle,
		target: params.target,
		targetHandle: params.targetHandle
	})
	
	// Attendre un instant et forcer la mise à jour pour s'assurer que tout est synchronisé
	await nextTick()
	triggerRef(nodes)
	
	// Vérifier si on connecte depuis un handle de condition
	const sourceNode = nodes.value.find(n => n.id === params.source)
	const targetNode = nodes.value.find(n => n.id === params.target)
	
	console.log('📍 Source Node:', {
		id: sourceNode?.id,
		type: sourceNode?.type,
		data: sourceNode?.data,
		exists: !!sourceNode
	})
	console.log('📍 Target Node:', {
		id: targetNode?.id,
		type: targetNode?.type,
		data: targetNode?.data,
		exists: !!targetNode
	})
	
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
	
	console.log('🆕 Création du nouvel edge:', newEdge)
	console.log('\n📈 AVANT ajout - Nombre d\'edges:', edges.value.length)
	console.log('Edges existants:', edges.value.map(e => ({
		id: e.id,
		source: e.source,
		target: e.target,
		type: e.type
	})))
	
	addEdges(newEdge)
	
	console.log('\n📉 APRÈS ajout - Nombre d\'edges:', edges.value.length)
	console.log('Edges après ajout:', edges.value.map(e => ({
		id: e.id,
		source: e.source,
		target: e.target,
		type: e.type
	})))
	console.log('=== FIN CONNEXION ===\n')
	
	// Réorganiser le graphe après la connexion avec debounce
	layoutGraphDebounced()
}

// Layout automatique
onNodesInitialized(() => {
	// Utiliser requestAnimationFrame pour optimiser le rendu
	requestAnimationFrame(() => {
		layoutAndFitGraph()
	})
})

// S'assurer que le layout est appliqué après le montage
onMounted(async () => {
	// Créer la version debounced après le montage
	layoutGraphDebounced = debounce(() => {
		// Ne pas faire de layout si on est en mode restauration
		if (!isRestoring) {
			layoutGraph()
		}
	}, 300)
	
	// Charger les données initiales de façon asynchrone
	try {
		await loadInitialData()
	} finally {
		isLoading.value = false
	}
})

// Cleanup des timeouts
onUnmounted(() => {
	timeouts.forEach(timeout => clearTimeout(timeout))
	timeouts.clear()
})

// Variable pour tracker les tentatives de layout et éviter la boucle infinie
let layoutRetryCount = 0
const MAX_LAYOUT_RETRIES = 3

// Variable pour désactiver temporairement l'auto-layout pendant la restauration
let isRestoring = false

async function layoutGraph() {
	try {
		// NE PAS faire de layout pendant une restauration
		if (isRestoring) {
			console.log('🚫 LAYOUT BLOQUÉ - Restauration en cours, layout ignoré')
			return
		}
		
		// S'assurer que tous les nodes existent
		const allNodesExist = nodes.value.every(node => findNode(node.id))
		
		if (!allNodesExist) {
			layoutRetryCount++
			console.warn(`🔄 Layout retry ${layoutRetryCount}/${MAX_LAYOUT_RETRIES} - Not all nodes initialized yet`)
			
			if (layoutRetryCount <= MAX_LAYOUT_RETRIES) {
				setTimeout(() => layoutGraph(), 100)
				return
			} else {
				console.error('🛑 ARRÊT - Trop de tentatives de layout, abandon pour éviter la boucle infinie!')
				layoutRetryCount = 0 // Reset pour la prochaine fois
				return
			}
		}
		
		// Reset du compteur en cas de succès
		layoutRetryCount = 0
		
		// Sauvegarder les positions des nodes restaurés ou verrouillés AVANT le layout
		const restoredNodes = new Map()
		nodes.value.forEach(node => {
			if (node.data?._restoredFromOriginal && node.data?._originalPosition) {
				restoredNodes.set(node.id, node.data._originalPosition)
				console.log('🔒 PROTECTION - Node restauré détecté:', node.id, node.data._originalPosition)
			}
			// Aussi protéger les nodes avec position verrouillée
			if (node.data?._lockedPosition) {
				restoredNodes.set(node.id, { ...node.position })
				console.log('🔐 PROTECTION - Node verrouillé détecté:', node.id, node.position)
			}
			// Protéger les nodes avec verrou temporaire
			if (node.data?._temporaryLock) {
				restoredNodes.set(node.id, { ...node.position })
				console.log('🔒 PROTECTION - Node temporairement verrouillé:', node.id, node.position)
			}
		})
		
		// Forcer le recalcul du layout avec des options améliorées
		const layoutedNodes = layout(nodes.value, edges.value, {
			direction: 'TB',
			nodeSpacing: 200,
			layerSpacing: 150
		})
		
		// Restaurer les positions des nodes qui ne doivent pas bouger
		layoutedNodes.forEach(node => {
			if (restoredNodes.has(node.id)) {
				const originalPos = restoredNodes.get(node.id)
				console.log('🔧 PROTECTION - Restauration position de:', node.id, 'vers', originalPos)
				node.position = originalPos
			}
		})
		
		// Utiliser triggerRef pour forcer la mise à jour avec shallowRef
		nodes.value = layoutedNodes
		triggerRef(nodes)
		
		// Forcer la mise à jour des edges
		await nextTick()
		triggerRef(edges)
		
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
	requestAnimationFrame(() => {
		fitView({ padding: 0.2 })
	})
}

// Drag & Drop handling (réutilisé du code original)
onNodeDragStart((params) => {
	isDragging.value = true
	const { node } = params
	const ghostId = `${node.id}-ghost`

	// Create a ghost node to show the original position
	const ghostNode = {
		...node,
		id: ghostId,
		data: {
			...node.data,
			isGhost: true // Mark as ghost for styling
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
		setTimeout(async () => {
			// Réaligner le workflow en aval du node qui a été déplacé
			await realignDownstreamWorkflow(node.id)
			
			// Puis faire le layout général
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
				<n-button @click="forceUpdateAllConnections" title="Corriger l'alignement des connexions">
					<template #icon>
						<Icon icon="mdi:refresh" />
					</template>
					Réaligner
				</n-button>
			</n-space>
		</div>

		<!-- Vue Flow -->
		<div style="flex: 1; position: relative;">
			<!-- Loading state -->
			<div v-if="isLoading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10;">
				<n-spin size="large" />
			</div>
			
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