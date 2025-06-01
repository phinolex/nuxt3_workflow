// Improved handleConditionConfirm function with better edge handling
const handleConditionConfirm = async (data: any) => {
	if (currentEditNode.value) {
		const nodeId = currentEditNode.value.id
		
		// Get all current outgoing edges
		const currentOutgoingEdges = edges.value.filter(edge => edge.source === nodeId)
		
		// Create a map of existing edges by sourceHandle
		const edgesByHandle = new Map<string, Edge>()
		currentOutgoingEdges.forEach(edge => {
			if (edge.sourceHandle) {
				edgesByHandle.set(edge.sourceHandle, edge)
			}
		})
		
		// Update the node with new data FIRST
		updateNode(nodeId, { data: { ...currentEditNode.value.data, ...data } })
		
		// Wait for Vue to update the DOM
		await nextTick()
		
		// Create sets to track changes
		const newBranchIds = new Set(data.branches.map((b: any) => b.id))
		const oldBranchIds = new Set(currentOutgoingEdges.map(e => e.sourceHandle).filter(Boolean))
		
		// Find branches to remove
		const branchesToRemove = [...oldBranchIds].filter(id => !newBranchIds.has(id))
		const edgesToRemove = currentOutgoingEdges.filter(edge => 
			edge.sourceHandle && branchesToRemove.includes(edge.sourceHandle)
		)
		
		// Find branches to add
		const branchesToAdd = [...newBranchIds].filter(id => !oldBranchIds.has(id))
		
		// Step 1: Handle removed branches
		if (edgesToRemove.length > 0) {
			// For each edge to remove, if it's connected to a real node, replace with add-element
			edgesToRemove.forEach(edge => {
				const targetNode = nodes.value.find(n => n.id === edge.target)
				if (targetNode && targetNode.type !== 'add-element') {
					const addElementId = `${nodeId}-${edge.sourceHandle}-ghost`
					addNodes({
						id: addElementId,
						type: 'add-element',
						position: targetNode.position,
						data: {
							conditionBranch: edge.sourceHandle,
							branchLabel: edge.label || 'Chemin'
						}
					})
				}
			})
			
			removeEdges(edgesToRemove)
		}
		
		// Wait for removal to complete
		await nextTick()
		
		// Step 2: Update labels for existing branches
		const edgeUpdatePromises: Promise<void>[] = []
		data.branches.forEach((branch: any) => {
			const existingEdge = edgesByHandle.get(branch.id)
			if (existingEdge && oldBranchIds.has(branch.id)) {
				if (existingEdge.label !== branch.label) {
					// Update edge label
					edgeUpdatePromises.push(
						new Promise<void>((resolve) => {
							updateEdge(existingEdge.id, { label: branch.label })
							resolve()
						})
					)
				}
			}
		})
		
		// Wait for all label updates
		await Promise.all(edgeUpdatePromises)
		
		// Step 3: Add new branches
		if (branchesToAdd.length > 0) {
			const conditionNode = nodes.value.find(n => n.id === nodeId)
			if (conditionNode) {
				const newNodes: any[] = []
				const newEdges: Edge[] = []
				
				branchesToAdd.forEach(branchId => {
					const branch = data.branches.find((b: any) => b.id === branchId)
					if (branch) {
						const index = data.branches.findIndex((b: any) => b.id === branchId)
						const totalBranches = data.branches.length
						const offsetX = (index - (totalBranches - 1) / 2) * 200
						
						const ghostId = `${nodeId}-${branchId}-ghost`
						
						// Add the add-element node
						newNodes.push({
							id: ghostId,
							type: 'add-element',
							position: {
								x: conditionNode.position.x + offsetX,
								y: conditionNode.position.y + 150
							},
							data: {
								label: `Suite: ${branch.label}`,
								isGhost: true,
								conditionBranch: branchId,
								branchLabel: branch.label
							}
						})
						
						// Create the edge
						newEdges.push({
							id: `e-${nodeId}-${branchId}`,
							source: nodeId,
							sourceHandle: branchId,
							target: ghostId,
							type: 'simple-condition',
							label: branch.label,
							animated: true
						})
					}
				})
				
				// Add all new nodes first
				if (newNodes.length > 0) {
					addNodes(newNodes)
					await nextTick()
				}
				
				// Then add all new edges
				if (newEdges.length > 0) {
					addEdges(newEdges)
				}
			}
		}
		
		// Step 4: Fix existing edges that may have lost their sourceHandle
		// This ensures all edges from the condition node use the correct handle
		await nextTick()
		
		const currentEdges = edges.value.filter(edge => edge.source === nodeId)
		const edgesToFix: Edge[] = []
		
		currentEdges.forEach(edge => {
			// Find the corresponding branch
			const branch = data.branches.find((b: any) => 
				b.id === edge.sourceHandle || 
				(edge.label && b.label === edge.label)
			)
			
			if (branch && edge.sourceHandle !== branch.id) {
				edgesToFix.push({
					...edge,
					sourceHandle: branch.id
				})
			}
		})
		
		// Apply fixes if needed
		if (edgesToFix.length > 0) {
			// Remove incorrect edges
			removeEdges(edgesToFix.map(e => ({ id: e.id })))
			await nextTick()
			
			// Re-add with correct sourceHandle
			addEdges(edgesToFix)
		}
		
		// Step 5: Reorganize the graph layout
		setTimeout(() => {
			layoutGraph()
		}, 150)
		
		currentEditNode.value = null
	}
}

// Additional helper function to validate edge connections
const validateConditionEdges = (nodeId: string) => {
	const node = findNode(nodeId)
	if (!node || node.type !== 'condition') return
	
	const branches = node.data.branches || []
	const currentEdges = edges.value.filter(edge => edge.source === nodeId)
	
	// Check each edge has a valid sourceHandle
	currentEdges.forEach(edge => {
		const validHandle = branches.some((b: any) => b.id === edge.sourceHandle)
		if (!validHandle) {
			console.warn(`Edge ${edge.id} has invalid sourceHandle: ${edge.sourceHandle}`)
		}
	})
	
	// Check each branch has an edge
	branches.forEach((branch: any) => {
		const hasEdge = currentEdges.some(edge => edge.sourceHandle === branch.id)
		if (!hasEdge) {
			console.warn(`Branch ${branch.id} (${branch.label}) has no edge`)
		}
	})
}