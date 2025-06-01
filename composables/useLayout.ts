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
        action: { width: 180, height: 80 }
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
    return nodes.map((node) => {
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
  }

  return { graph, layout }
}