import dagre from '@dagrejs/dagre'
import { Position, useVueFlow } from '@vue-flow/core'
import { ref } from 'vue'

/**
 * Composable to run the layout algorithm on the graph.
 * It uses the `dagre` library to calculate the layout of the nodes and edges.
 */
export function useLayout() {
  const { findNode } = useVueFlow()

  const graph = ref(new dagre.graphlib.Graph())

  // ✅ SOLUTION JAVASCRIPT: Pas de typage explicite
  function layout(nodes, edges) {
    // we create a new graph instance, in case some nodes/edges were removed, otherwise dagre would act as if they were still there
    const dagreGraph = new dagre.graphlib.Graph()

    graph.value = dagreGraph

    dagreGraph.setDefaultEdgeLabel(() => ({}))

    dagreGraph.setGraph({ 
      rankdir: 'TB',
      nodesep: 100,  // Espacement horizontal entre les nodes
      ranksep: 80,   // Espacement vertical entre les niveaux
      marginx: 20,
      marginy: 20
    })

    for (const node of nodes) {
      // if you need width+height of nodes for your layout, you can use the dimensions property of the internal node (`GraphNode` type)
      const graphNode = findNode(node.id)

      if (!graphNode) {
        continue
      }

      // Utiliser des dimensions par défaut plus appropriées selon le type de node
      const defaultDimensions = {
        trigger: { width: 180, height: 60 },
        question: { width: 220, height: 120 },
        audio: { width: 200, height: 100 },
        condition: { width: 200, height: 100 },
        end: { width: 100, height: 60 },
        action: { width: 180, height: 80 },
        'add-element': { width: 240, height: 80 }
      }
      
      const nodeType = node.type || 'action'
      const defaultDim = defaultDimensions[nodeType] || defaultDimensions.action
      
      dagreGraph.setNode(node.id, { 
        width: graphNode.dimensions.width || defaultDim.width, 
        height: graphNode.dimensions.height || defaultDim.height 
      })
    }

    for (const edge of edges) {
      dagreGraph.setEdge(edge.source, edge.target)
    }

    dagre.layout(dagreGraph)

    // set nodes with updated positions
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id)

      const position = {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      }

      return {
        ...node,
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
        position,
      }
    })

    // 🎯 CORRECTION ALIGNEMENT: Centrer les nodes qui convergent
    return centerConvergingNodes(layoutedNodes, edges)
  }

  // 🎯 Fonction simple pour centrer les nodes qui ont plusieurs connexions entrantes
  function centerConvergingNodes(nodes, edges) {
    nodes.forEach(node => {
      // Trouver toutes les connexions entrantes vers ce node
      const incomingEdges = edges.filter(edge => edge.target === node.id)
      
      // Si le node a 2+ connexions entrantes, le centrer
      if (incomingEdges.length >= 2) {
        // Récupérer les nodes sources (parents)
        const sourceNodes = incomingEdges.map(edge => {
          return nodes.find(n => n.id === edge.source)
        }).filter(Boolean)
        
        if (sourceNodes.length >= 2) {
          // Calculer la position X moyenne des parents
          const avgX = sourceNodes.reduce((sum, sourceNode) => {
            const nodeWidth = sourceNode.dimensions?.width || getDefaultWidth(sourceNode.type)
            return sum + sourceNode.position.x + (nodeWidth / 2) // Centre du node parent
          }, 0) / sourceNodes.length
          
          // Centrer le node convergent
          const currentNodeWidth = node.dimensions?.width || getDefaultWidth(node.type)
          node.position.x = avgX - (currentNodeWidth / 2)
        }
      }
    })
    
    return nodes
  }

  // Fonction helper pour obtenir la largeur par défaut d'un node
  function getDefaultWidth(nodeType) {
    const defaultDimensions = {
      trigger: 180,
      question: 220,
      audio: 200,
      condition: 200,
      end: 100,
      action: 180,
      'add-element': 240
    }
    return defaultDimensions[nodeType] || 180
  }

  return { graph, layout }
}