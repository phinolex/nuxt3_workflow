# Test Plan for Condition Node Edge Positioning

## Problem Fixed
When branches are added or removed from a condition node, the existing edges don't update their positions to stay connected to the correct handles.

## Solution Implemented

1. **Force Edge Recreation**: When branches change, we now:
   - Remove all edges connected to the condition node
   - Wait for Vue to update the DOM (nextTick)
   - Recreate the edges with the correct handle positions

2. **Handle Positioning**: 
   - Added `transform: translateX(-50%)` to center handles properly
   - Handles are dynamically positioned based on the number of branches

3. **Force Re-render**:
   - Added a computed `branchesKey` based on branch IDs
   - Used this key on the condition node to force re-render when branches change

## Test Steps

1. **Add a Branch**:
   - Click on a condition node to edit it
   - Add a new branch
   - Verify that all existing edges remain connected to their correct branches
   - Verify that new branch gets a ghost node with animated edge

2. **Remove a Branch**:
   - Click on a condition node to edit it
   - Remove a branch that has an edge connected
   - Verify that remaining edges stay connected to correct branches
   - Verify that the removed branch's edge is deleted

3. **Reorder Branches**:
   - Change branch order (if applicable)
   - Verify edges follow their respective branches

4. **Multiple Changes**:
   - Add and remove multiple branches in one edit
   - Verify all edges update correctly

## Key Code Changes

1. **questionnaire-builder.vue**:
   - Made `handleConditionConfirm` async
   - Added edge recreation logic in nextTick
   - Removed direct edge updates, now recreating them

2. **ConditionNode.vue**:
   - Added `transform: translateX(-50%)` to handle styles
   - Added `branchesKey` computed property
   - Used key on root element to force re-render

## Expected Behavior

- Edges should always connect to the correct branch handle
- When branches are added/removed, edges should smoothly transition to new positions
- No edges should be left disconnected or pointing to wrong handles
- The layout should reorganize after changes