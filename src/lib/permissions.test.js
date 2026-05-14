import { describe, expect, it } from 'vitest';
import { canPerform, hasPageAccess } from './permissions.js';

describe('permissions', () => {
  const operario = { role: 'operario' };
  const admin = { role: 'administrador' };

  it('operario puede inventario y perfil', () => {
    expect(hasPageAccess(operario, 'productPage')).toBe(true);
    expect(hasPageAccess(operario, 'adminPage')).toBe(false);
  });

  it('operario solo crea movimientos', () => {
    expect(canPerform(operario, 'inventory.movements.create')).toBe(true);
    expect(canPerform(operario, 'inventory.products.manage')).toBe(false);
  });

  it('administrador gestiona productos', () => {
    expect(canPerform(admin, 'inventory.products.manage')).toBe(true);
    expect(hasPageAccess(admin, 'adminPage')).toBe(true);
  });
});
