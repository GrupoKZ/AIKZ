// app/components/Sidebar.jsx
import { FontAwesome5 } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Sidebar({ setContenidoActual, contenidoActual }) {
  const menuItems = [
    { nombre: 'Panel', icono: 'home', ruta: '/pages/DashboardAdmin' },
    { nombre: 'Clientes', icono: 'users', ruta: '/pages/clientes' },
    { nombre: 'Vendedores', icono: 'user-tie', ruta: '/pages/Vendedores' },
    { nombre: 'Pedidos', icono: 'shopping-cart', ruta: '/pages/pedidos' },
    { nombre: 'Gastos', icono: 'money-bill', ruta: '/pages/Gastos' },
    { nombre: 'Celofán', icono: 'box-open', ruta: '/pages/productos/celofan' },
  ];

  return (
    <View style={styles.sidebar}>
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.menuItem,
            contenidoActual === item.ruta && styles.menuItemActivo,
          ]}
          onPress={() => setContenidoActual(item.ruta)}
        >
          <FontAwesome5 name={item.icono} size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.menuText}>{item.nombre}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 200,
    backgroundColor: '#1e293b',
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuItemActivo: {
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  menuText: {
    color: '#fff',
    fontSize: 14,
  },
});
