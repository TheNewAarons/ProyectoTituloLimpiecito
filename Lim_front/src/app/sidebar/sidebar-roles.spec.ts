import { menuDelRol, rolesDeUrl } from './sidebar.component';

describe('Menú por rol', () => {
  const rutas = (rol: string): string[] => {
    const lista: string[] = [];
    menuDelRol(rol).forEach((item) => {
      lista.push(item.path);
      (item.children || []).forEach((hijo) => lista.push(item.path + '/' + hijo.path));
    });
    return lista;
  };

  it('Supervisor no ve pantallas que el backend le rechaza', () => {
    const r = rutas('Supervisor');
    expect(r).not.toContain('/bodega/solicitudes');
    expect(r).not.toContain('/cajas');
    expect(r).not.toContain('/analytics');
    expect(r).toContain('/bodega/producto');
    expect(r).toContain('/centro_costos');
  });

  it('Administrador ve todo', () => {
    const r = rutas('Administrador');
    expect(r).toContain('/bodega/solicitudes');
    expect(r).toContain('/cajas');
    expect(r).toContain('/pev/asignacion-masiva');
  });

  it('LVL_ARCHIVO no ve submenús que quedan vacíos', () => {
    expect(rutas('LVL_ARCHIVO')).not.toContain('/bodega');
  });

  it('rolesDeUrl compara por segmentos', () => {
    expect(rolesDeUrl('/bodega/solicitudes/5')).toEqual(['Administrador', 'Operaciones']);
    expect(rolesDeUrl('/bodega/productos/3/kardex')).toBeNull();
    expect(rolesDeUrl('/bodega/producto')).toBeNull();
    expect(rolesDeUrl('/cajas/ver/2?x=1')).toEqual(['Administrador']);
  });
});
