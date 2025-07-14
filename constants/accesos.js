// constants/accesos.js

export const accesos = [
  {
    nombre: 'Clientes',
    ruta: '/clientes',
    icono: 'users',
    rol: ['admin', 'vendedor']
  },
  {
    nombre: 'Productos',
    ruta: '/productos',
    icono: 'box',
    rol: ['admin']
  },
  {
    nombre: 'Notas de Venta',
    ruta: '/notas-venta',
    icono: 'file-text',
    rol: ['admin', 'vendedor']
  },
  {
    nombre: 'Almacén',
    ruta: '/almacen',
    icono: 'archive',
    rol: ['admin']
  },
  {
    nombre: 'Finanzas',
    ruta: '/finanzas',
    icono: 'dollar-sign',
    rol: ['admin']
  }
]
