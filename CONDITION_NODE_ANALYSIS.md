# Condition Node Edge Handling Analysis

## Current Implementation Issues

### 1. **Handle ID Mismatch**
- The initial edges use sourceHandle like `condition1-maman` but the ConditionNode expects branch IDs to match exactly
- When branches are updated, the handle IDs may not align with the edge sourceHandles

### 2. **Edge Recreation Issues**
- The current implementation removes ALL edges and recreates them, causing:
  - Visual flickering
  - Potential loss of edge state
  - Timing issues with Vue Flow's internal edge management

### 3. **Timing Problems**
- Multiple `await nextTick()` calls without proper coordination
- Fixed timeouts that may not align with Vue Flow's rendering cycle
- Edge updates happening before the DOM handles are fully rendered

### 4. **Edge Type Preservation**
- Forces all edges to use 'simple-condition' type
- Doesn't preserve the original edge type when recreating

## Recommended Improvements

### 1. **Simplified Edge Management**
```typescript
// Instead of removing and recreating all edges:
// 1. Only remove edges for deleted branches
// 2. Only add edges for new branches
// 3. Update labels in-place for existing branches
```

### 2. **Better Handle Synchronization**
- Ensure the ConditionNode component uses a computed key to force re-render when branches change
- Wait for Vue Flow to process node updates before manipulating edges

### 3. **Edge Validation**
- Add a validation function to ensure all edges have correct sourceHandles
- Log warnings when edge/handle mismatches are detected

### 4. **Improved Timing**
- Use Promise-based waiting instead of fixed timeouts
- Wait for specific Vue Flow events when possible

## Implementation Recommendations

1. **Use the improved function** in `ImprovedHandleConditionConfirm.js`
2. **Add edge validation** after each update to catch issues early
3. **Consider using Vue Flow's built-in events** like `onNodesChange` to detect when handles are ready
4. **Implement proper error handling** for edge operations

## Testing Checklist

- [ ] Add a new branch to an existing condition
- [ ] Remove a branch from a condition
- [ ] Rename a branch (change label only)
- [ ] Remove all branches and add new ones
- [ ] Connect branches to different node types
- [ ] Verify edges maintain correct positions after layout updates
- [ ] Check for visual flickering during updates
- [ ] Ensure animated edges remain animated
- [ ] Verify edge labels update correctly