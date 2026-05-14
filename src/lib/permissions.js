export const ROLE_PERMISSIONS = Object.freeze({
  administrador: {
    pages: [
      'dashboardPage',
      'profilePage',
      'productPage',
      'reportsPage',
      'alertsPage',
      'suppliersPage',
      'inventoryMovementsPage',
      'consumptionReportPage',
      'adminPage',
    ],
    actions: ['inventory.products.manage', 'inventory.movements.manage', 'suppliers.manage'],
  },
  supervisor: {
    pages: [
      'dashboardPage',
      'profilePage',
      'productPage',
      'reportsPage',
      'alertsPage',
      'suppliersPage',
      'inventoryMovementsPage',
      'consumptionReportPage',
    ],
    actions: ['inventory.products.manage', 'inventory.movements.manage', 'suppliers.manage'],
  },
  bodeguero: {
    pages: [
      'dashboardPage',
      'profilePage',
      'productPage',
      'reportsPage',
      'alertsPage',
      'suppliersPage',
      'inventoryMovementsPage',
    ],
    actions: ['inventory.products.manage', 'inventory.movements.manage'],
  },
  operario: {
    pages: ['dashboardPage', 'profilePage', 'productPage'],
    actions: ['inventory.movements.create'],
  },
  admin: {
    pages: [
      'dashboardPage',
      'profilePage',
      'productPage',
      'reportsPage',
      'alertsPage',
      'suppliersPage',
      'inventoryMovementsPage',
      'consumptionReportPage',
      'adminPage',
    ],
    actions: ['inventory.products.manage', 'inventory.movements.manage', 'suppliers.manage'],
  },
  user: {
    pages: ['dashboardPage', 'profilePage'],
    actions: [],
  },
});

export const PATH_TO_PAGE_ID = Object.freeze({
  '/dashboard': 'dashboardPage',
  '/profile': 'profilePage',
  '/inventory': 'productPage',
  '/reports': 'reportsPage',
  '/reports/movements': 'inventoryMovementsPage',
  '/reports/consumption': 'consumptionReportPage',
  '/alerts': 'alertsPage',
  '/suppliers': 'suppliersPage',
  '/admin': 'adminPage',
});

export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function getPermissionsForRole(roleSlug) {
  const role = normalizeRole(roleSlug);
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
}

export function hasPageAccess(user, pageId) {
  if (!user) return false;
  return getPermissionsForRole(user.role).pages.includes(pageId);
}

export function canPerform(user, action) {
  if (!user) return false;
  return getPermissionsForRole(user.role).actions.includes(action);
}
