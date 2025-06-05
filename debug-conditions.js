// Script pour débugger les conditions dans le localStorage
// Exécuter ce script dans la console du navigateur

function debugConditions() {
  console.log("=== DEBUG CONDITIONS ===");
  
  // Lister tous les workflows
  const workflows = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('workflow_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        workflows.push({ key, data });
      } catch (e) {
        console.error('Erreur parsing:', key);
      }
    }
  }
  
  console.log(`Nombre de workflows trouvés: ${workflows.length}`);
  
  // Analyser chaque workflow
  workflows.forEach(({ key, data }) => {
    console.log(`\n--- Workflow: ${data.metadata?.name || key} ---`);
    
    // Trouver les nodes de condition
    const conditionNodes = data.nodes.filter(n => n.type === 'condition');
    console.log(`Nodes de condition: ${conditionNodes.length}`);
    
    conditionNodes.forEach(node => {
      console.log(`\nCondition: ${node.data.label} (${node.id})`);
      console.log('Branches:', node.data.branches);
      
      // Trouver les edges sortants
      const outgoingEdges = data.edges.filter(e => e.source === node.id);
      console.log('Edges sortants:');
      outgoingEdges.forEach(edge => {
        console.log(`  - Edge ${edge.id}:`);
        console.log(`    sourceHandle: ${edge.sourceHandle}`);
        console.log(`    label: ${edge.label}`);
        console.log(`    target: ${edge.target}`);
        console.log(`    data:`, edge.data);
      });
    });
  });
  
  // Vérifier currentQuestionnaire
  const current = localStorage.getItem('currentQuestionnaire');
  if (current) {
    console.log('\n=== CURRENT QUESTIONNAIRE ===');
    const data = JSON.parse(current);
    const conditionNodes = data.nodes.filter(n => n.type === 'condition');
    conditionNodes.forEach(node => {
      console.log(`Condition: ${node.data.label}`);
      console.log('Branches:', JSON.stringify(node.data.branches, null, 2));
    });
  }
}

// Exécuter la fonction
debugConditions();