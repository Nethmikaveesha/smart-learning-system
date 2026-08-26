/**
 * Query students linked to a parent/guardian user.
 * Supports legacy single `parent` field and multi-link `parents[]`.
 */
export function linkedStudentsQuery(parentId) {
  return {
    $or: [{ parent: parentId }, { parents: parentId }],
  };
}

export const PARENT_RELATIONSHIPS = ["Mother", "Father", "Guardian"];

export function isValidParentRelationship(value) {
  return PARENT_RELATIONSHIPS.includes(String(value || "").trim());
}
