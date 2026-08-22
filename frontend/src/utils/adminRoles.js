/** Frontend helpers mirroring backend admin hierarchy. */

export function isSuperAdmin(userOrRole) {
  const role =
    typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  return role === "superadmin";
}

export function isAdminRole(userOrRole) {
  const role =
    typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  return role === "admin" || role === "superadmin";
}

/** Map auth role to dashboard workspace (superadmin uses admin UI). */
export function getWorkspaceRole(role) {
  return role === "superadmin" ? "admin" : role;
}

export function roleAllowed(userRole, allowedRoles = []) {
  if (!userRole) return false;
  if (allowedRoles.includes(userRole)) return true;
  if (userRole === "superadmin" && allowedRoles.includes("admin")) return true;
  return false;
}
