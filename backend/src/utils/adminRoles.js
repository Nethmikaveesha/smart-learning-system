/**
 * Admin hierarchy helpers.
 * - superadmin: manage Admin + Teacher + Student + Parent
 * - admin: manage Teacher + Student + Parent only
 */

export const ELEVATED_ADMIN_ROLES = ["admin", "superadmin"];

export function isSuperAdmin(userOrRole) {
  const role =
    typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  return role === "superadmin";
}

export function isAdminRole(userOrRole) {
  const role =
    typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  return ELEVATED_ADMIN_ROLES.includes(role);
}

export function isElevatedTargetRole(role) {
  return ELEVATED_ADMIN_ROLES.includes(role);
}

/**
 * Normal admins cannot manage admin/superadmin accounts.
 * Super admins can manage everyone (except last-superadmin safeguards elsewhere).
 */
export function getAdminManagementError(actor, target) {
  if (!actor || !target) {
    return "Unauthorized";
  }

  if (!isElevatedTargetRole(target.role)) {
    return null;
  }

  if (!isSuperAdmin(actor)) {
    return "Only a Super Admin can manage administrator accounts";
  }

  return null;
}
