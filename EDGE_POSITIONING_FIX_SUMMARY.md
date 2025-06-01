# Edge Positioning Fix Summary

## Issue
When branches were added or removed from a condition node, existing edges didn't update their positions to stay connected to the correct handles.

## Root Cause
- Vue Flow wasn't properly updating edge positions when handles were dynamically repositioned
- The handles on condition nodes are positioned based on the number of branches, so positions change when branches are added/removed

## Solution
1. **Force edge recreation after branch changes**:
   - Remove all edges connected to the condition node
   - Wait for Vue to update the DOM
   - Recreate the edges, which forces them to recalculate their positions

2. **Improve handle positioning**:
   - Added `transform: translateX(-50%)` to center handles
   - This ensures consistent positioning regardless of branch count

3. **Force node re-render**:
   - Added a computed `branchesKey` based on branch IDs
   - Used as `:key` on the condition node to force complete re-render

## Code Changes

### questionnaire-builder.vue
```javascript
// Made handleConditionConfirm async and added edge recreation
const handleConditionConfirm = async (data: any) => {
  // Update node
  updateNode(currentEditNode.value.id, { data: { ...currentEditNode.value.data, ...data } })
  
  // Wait for DOM update
  await nextTick()
  
  // ... existing logic ...
  
  // Force edge recreation in nextTick
  nextTick(async () => {
    const allConditionEdges = edges.value.filter(edge => edge.source === nodeId)
    const edgesToRecreate = allConditionEdges.map(edge => ({ ...edge }))
    removeEdges(edgesToRecreate)
    await nextTick()
    addEdges(edgesToRecreate)
    // ... update labels and layout
  })
}
```

### ConditionNode.vue
```vue
<!-- Added key to force re-render -->
<div class="condition-node" :key="branchesKey">
  <!-- Added transform to handle style -->
  <Handle 
    :style="{ 
      left: `${(index + 1) * (100 / (getBranches().length + 1))}%`,
      transform: 'translateX(-50%)'
    }"
  />
</div>

<script>
// Added computed key
const branchesKey = computed(() => {
  const branches = getBranches()
  return branches.map(b => b.id).join('-')
})
</script>
```

## Result
Edges now properly update their positions when branches are added or removed from condition nodes.