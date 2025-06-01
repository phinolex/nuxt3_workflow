<script lang="ts" setup>
import type { Edge, GraphEdge, GraphNode, Node } from '@vue-flow/core'

import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MarkerType, Panel, VueFlow, getConnectedEdges, useVueFlow } from '@vue-flow/core'
import { nextTick, ref, watch, computed } from 'vue'

import ActionGhostNode from '../components/ActionGhostNode.vue'
import ActionNode from '../components/ActionNode.vue'
import AddNodeEdge from '../components/AddNodeEdge.vue'
import EndNode from '../components/EndNode.vue'
import TriggerNode from '../components/TriggerNode.vue'

import { useLayout } from '../composables/useLayout'

// prettier-ignore
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
	onPaneReady,
	updateEdge,
	updateNode,
	onNodesChange,
	onEdgesChange,
	onNodesInitialized,
	getNodes,
	getEdges,
} =	useVueFlow()
const { layout } = useLayout()

const nodes = ref<Node[]>([
	{ id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: { step: '1', name: 'Trigger', node: 'Manual' } },
	{ id: '2', type: 'action', position: { x: 0, y: 0 }, data: { step: '2', name: 'Get IDs', node: 'OracleDB' } },
	{ id: '3', type: 'action', position: { x: 0, y: 0 }, data: { step: '3', name: 'Create XML', node: 'OracleDB' } },
	{ id: '4', type: 'end', position: { x: 0, y: 0 }, data: { step: '4', name: '', node: '' } },
])

const edges = ref<Edge[]>([
	{ id: 'e1-2', source: '1', target: '2', type: 'add-node' },
	{ id: 'e2-3', source: '2', target: '3', type: 'add-node' },
	{ id: 'e3-4', source: '3', target: '4', type: 'add-node' },
])

// Flag pour éviter le relayout pendant le drag
const isDragging = ref(false)

// Utiliser onNodesInitialized pour s'assurer que les nœuds ont leurs dimensions
onNodesInitialized(() => {
	layoutAndFitGraph()
})

onNodeDragStart((params) => {
	const { node } = params
	
	// Activer le flag de drag
	isDragging.value = true

	const ghostId = `${node.id}-ghost`

	// Add ghost node
	addNodes({ ...node, id: ghostId, type: 'action-ghost' } satisfies GraphNode)

	// Transfer edges to ghost
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

	// Move ghost node
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

	// Update edges
	const connectedEdges = getConnectedEdges([intersectionNode, ghostNode], edges.value) as GraphEdge[]
	console.log(connectedEdges.length, connectedEdges)

	for (const edge of connectedEdges) {
		console.log(edge.id, edge)
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
	const { node, intersections } = params
	const ghostId = `${node.id}-ghost`
	const ghostNode = findNode(ghostId)

	if (!ghostNode) return

	// Transfer edges back
	const connectedEdges = getConnectedEdges([ghostNode], edges.value) as GraphEdge[]
	for (const edge of connectedEdges) {
		edge.source = edge.source === ghostId ? node.id : edge.source
		edge.target = edge.target === ghostId ? node.id : edge.target
	}

	// Remove ghost node
	removeNodes([ghostNode])
	
	// Désactiver le flag de drag
	isDragging.value = false

	// Layout flow with delay to ensure dimensions are calculated
	nextTick(() => {
		setTimeout(() => {
			layoutGraph()
		}, 50)
	})
})

onConnect((params) => {
	addEdges([params])
})

// Écouter les changements de nœuds pour relancer le layout
onNodesChange((changes) => {
	// Ne pas relancer le layout pendant le drag
	if (isDragging.value) return
	
	// Si un nœud est ajouté ou supprimé, relancer le layout
	const hasChanges = changes.some(change => change.type === 'add' || change.type === 'remove')
	if (hasChanges) {
		// Delay to ensure new nodes have dimensions
		setTimeout(() => {
			layoutAndFitGraph()
		}, 100)
	}
})

// Écouter les changements d'edges pour relancer le layout
onEdgesChange((changes) => {
	// Ne pas relancer le layout pendant le drag
	if (isDragging.value) return
	
	// Si un edge est ajouté ou supprimé, relancer le layout
	const hasChanges = changes.some(change => change.type === 'add' || change.type === 'remove')
	if (hasChanges) {
		// Delay to ensure changes are processed
		setTimeout(() => {
			layoutGraph()
		}, 50)
	}
})

async function layoutGraph() {
	nodes.value = layout(nodes.value, edges.value)
}

async function layoutAndFitGraph() {
	await layoutGraph()

	setTimeout(() => {
		fitView({ padding: 0.2 })
	}, 50)
}

// Créer un objet computed pour le workflow JSON
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
			label: edge.label
		}))
	}
})

// Observer les changements et logger le JSON
watch(workflowJSON, (newWorkflow) => {
	console.log('=== Workflow JSON Updated ===')
	console.log(JSON.stringify(newWorkflow, null, 2))
	console.log('=============================')
}, { deep: true, immediate: true })
</script>

<template>
	<div style="height: 100vh">
		<VueFlow
			v-model:nodes="nodes"
			v-model:edges="edges"
			:default-zoom="1.5"
			:min-zoom="0.2"
			:max-zoom="4"
			:default-edge-options="{ type: 'add-node' }"
			pan-on-scroll
		>
			<Background pattern-color="#ccc" :size="0.5" :gap="5" />

			<Panel class="process-panel" position="top-right">
				<div class="layout-panel">
					<button title="set vertical layout" @click="layoutAndFitGraph()">
						<Icon name="vertical" />
					</button>
				</div>
			</Panel>

			<Controls />

			<template #node-trigger="nodeProps">
				<TriggerNode v-bind="nodeProps" />
			</template>

			<template #node-action="nodeProps">
				<ActionNode v-bind="nodeProps" />
			</template>

			<template #node-action-ghost="nodeProps">
				<ActionGhostNode v-bind="nodeProps" />
			</template>

			<template #node-end="nodeProps">
				<EndNode v-bind="nodeProps" />
			</template>

			<template #edge-add-node="edgeProps">
				<AddNodeEdge v-bind="edgeProps" />
			</template>
		</VueFlow>
	</div>
</template>

<style>
.process-panel,
.layout-panel {
	display: flex;
	gap: 10px;
}

.process-panel {
	background-color: #2d3748;
	padding: 10px;
	border-radius: 8px;
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
	display: flex;
	flex-direction: column;
}

.process-panel button {
	border: none;
	cursor: pointer;
	background-color: #4a5568;
	border-radius: 8px;
	color: white;
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.process-panel button {
	font-size: 16px;
	width: 40px;
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.checkbox-panel {
	display: flex;
	align-items: center;
	gap: 10px;
}

.process-panel button:hover,
.layout-panel button:hover {
	background-color: #2563eb;
	transition: background-color 0.2s;
}

.process-panel label {
	color: white;
	font-size: 12px;
}

.vue-flow__node {
	display: flex;
}
</style>