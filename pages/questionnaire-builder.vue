<script lang="ts" setup>
import type { Edge, GraphEdge, GraphNode, Node } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MarkerType, Panel, VueFlow, getConnectedEdges, useVueFlow } from '@vue-flow/core'
import { nextTick, ref, shallowRef, triggerRef, watch, computed, onMounted, onUnmounted } from 'vue'
import { NButton, NIcon, NSpace, NSpin, useMessage, useDialog } from 'naive-ui'
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

// États pour les modals
const showQuestionModal = ref(false)
const showAudioModal = ref(false)
const showConditionModal = ref(false)
const currentEditNode = ref<Node | null>(null)

// Gestion des timeouts pour cleanup
const timeouts = new Set<NodeJS.Timeout>()

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

const handleNodeDelete = (nodeId: string) => {
	const node = findNode(nodeId)
	if (!node) return
	
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
		
		// D'abord supprimer les edges sortants et le node end s'il existe
		if (outgoingEdge) {
			removeEdges([outgoingEdge])
			
			// Si le node sortant était un node "end" temporaire, le supprimer aussi
			const targetNode = findNode(outgoingEdge.target)
			if (targetNode && targetNode.type === 'end') {
				removeNodes([targetNode])
			}
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
		
		// Ajouter le nouveau node à sa position originale
		const restoredPosition = addElementInfo.originalPosition || node.position
		console.log('✨ RESTAURATION - Position finale utilisée pour le nouveau node:', restoredPosition)
		
		addNodes({
			id: addElementId,
			type: 'add-element',
			position: restoredPosition,
			data: {
				conditionBranch: addElementInfo.conditionBranch,
				branchLabel: addElementInfo.branchLabel,
				isGhost: true,
				_restoredFromOriginal: true, // Marquer pour éviter le repositionnement
				_originalPosition: restoredPosition // Sauvegarder la position cible
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
			setTimeout(() => {
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
				
				// RESTAURER AUSSI l'edge sortant si il existait
				if (savedOutgoingEdge) {
					console.log('✨ Restauration de l\'edge sortant:', savedOutgoingEdge)
					const restoredOutgoingEdge = {
						...savedOutgoingEdge,
						id: `e-${addElementId}-${savedOutgoingEdge.target}`,
						source: addElementId, // Le nouveau node comme source
						target: savedOutgoingEdge.target, // Garder la même cible (probablement "Fin")
						type: savedOutgoingEdge.type || 'add-node',
						animated: false
					}
					addEdges(restoredOutgoingEdge)
					console.log('✅ Edge sortant restauré:', restoredOutgoingEdge)
				} else {
					console.log('ℹ️ Pas d\'edge sortant à restaurer')
				}
				
				// Mettre à jour les internals pour s'assurer que les handles sont connectés
				updateNodeInternals([addElementId])
				
				// ATTENTION: Le layout peut repositionner le node!
				console.log('⚠️ ATTENTION - Avant layoutGraph, position du node restauré:', findNode(addElementId)?.position)
				
				// SOLUTION: Forcer la position APRÈS le layout avec un délai
				const targetPosition = addElementInfo.originalPosition || node.position
				
				// Relancer le layout si nécessaire
				layoutGraph()
				
				console.log('🔄 APRÈS layoutGraph, position du node restauré:', findNode(addElementId)?.position)
				
				// Forcer la position correcte après le layout avec délai
				setTimeout(() => {
					console.log('🔧 FORCER - Position avant correction:', findNode(addElementId)?.position)
					updateNode(addElementId, { position: targetPosition })
					console.log('✅ FORCER - Position après correction:', targetPosition)
					
					// DÉSACTIVER le mode restauration après 1 seconde
					setTimeout(() => {
						isRestoring = false
						console.log('✅ MODE RESTAURATION DÉSACTIVÉ - Auto-layout réactivé')
					}, 1000)
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
	const timeoutId = setTimeout(() => {
		console.log('Nodes after replacement delay:', nodes.value.map(n => ({ id: n.id, type: n.type })))
		updateNodeInternals([event.newNodeId])
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
	
	// Réorganiser le graphe
	setTimeout(() => {
		console.log('🎨 DÉCLENCHEMENT LAYOUT GRAPH')
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
	layoutGraphDebounced = debounce(layoutGraph, 300)
	
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
		
		// Sauvegarder les positions des nodes restaurés AVANT le layout
		const restoredNodes = new Map()
		nodes.value.forEach(node => {
			if (node.data?._restoredFromOriginal && node.data?._originalPosition) {
				restoredNodes.set(node.id, node.data._originalPosition)
				console.log('🔒 PROTECTION - Node restauré détecté:', node.id, node.data._originalPosition)
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