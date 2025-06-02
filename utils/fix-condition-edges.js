// Fonction utilitaire pour corriger les edges de condition existants
export function fixConditionEdges(edges, nodes) {
  return edges.map(edge => {
    // Trouver le node source
    const sourceNode = nodes.find(n => n.id === edge.source)
    
    // Si l'edge provient d'une condition avec un sourceHandle
    if (sourceNode?.type === 'condition' && edge.sourceHandle) {
      // S'assurer que le type est 'simple-condition'
      return {
        ...edge,
        type: 'simple-condition'
      }
    }
    
    return edge
  })
}