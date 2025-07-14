import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import LogoutButton from './LogoutButton'; // ✅ Ruta corregida

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Sidebar({ expanded }) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState(null);

  const handleToggle = (menu) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const menuItems = [
    {
      nombre: 'Dashboard',
      icono: 'home',
      ruta: '/pages/DashboardAdmin',
    },
    {
      nombre: 'Finanzas',
      icono: 'wallet',
      hijos: [
        { nombre: 'Gastos', ruta: '/pages/Gastos' },
        { nombre: 'Cuentas por cobrar', ruta: '/pages/CuentasCobrar' },
        { nombre: 'Cuentas por pagar', ruta: '/pages/CuentasPagar' },
      ],
    },
    {
      nombre: 'Productos',
      icono: 'box-open',
      hijos: [
        { nombre: 'Celofán', ruta: '/pages/ProductosCelofan' },
        { nombre: 'Polietileno', ruta: '/pages/ProductosPolietileno' },
      ],
    },
    {
      nombre: 'Pedidos',
      icono: 'clipboard-list',
      ruta: '/pages/Pedidos',
    },
    {
      nombre: 'Clientes',
      icono: 'user-friends',
      ruta: '/pages/clientes',
    },
    {
      nombre: 'Vendedores',
      icono: 'user-tie',
      ruta: '/pages/Vendedores',
    },
    {
      nombre: 'Producción',
      icono: 'industry',
      hijos: [
        { nombre: 'Producción Celofán', ruta: '/pages/ProduccionCelofan' },
        { nombre: 'Producción Polietileno', ruta: '/pages/ProduccionPolietileno' },
      ],
    },
    {
      nombre: 'Almacén',
      icono: 'warehouse',
      hijos: [
        { nombre: 'Almacén Celofán', ruta: '/pages/AlmacenCelofan' },
        { nombre: 'Almacén Polietileno', ruta: '/pages/AlmacenPolietileno' },
      ],
    },
  ];

  return (
    <View style={[styles.sidebar, expanded ? styles.sidebarExpanded : styles.sidebarCollapsed]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {menuItems.map((item, index) => (
          <View key={index}>
            <TouchableOpacity
              onPress={() => item.hijos ? handleToggle(item.nombre) : router.push(item.ruta)}
              style={styles.menuItem}
            >
              <View style={styles.menuLeft}>
                <FontAwesome5 name={item.icono} size={18} color="#8b9dc3" style={styles.icon} />
                {expanded && <Text style={styles.menuText}>{item.nombre}</Text>}
              </View>
              {expanded && item.hijos && (
                <FontAwesome5
                  name={openMenu === item.nombre ? 'angle-down' : 'angle-right'}
                  size={14}
                  color="#8b9dc3"
                  style={styles.arrowIcon}
                />
              )}
            </TouchableOpacity>

            {expanded && item.hijos && openMenu === item.nombre && (
              <View style={styles.submenu}>
                {item.hijos.map((sub, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => router.push(sub.ruta)}
                    style={styles.submenuItem}
                  >
                    <Text style={styles.submenuText}>{sub.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.logoutContainer}>
        <LogoutButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#1e293b',
    paddingTop: 40,
    justifyContent: 'space-between',
  },
  sidebarExpanded: {
    width: 250,
  },
  sidebarCollapsed: {
    width: 70,
  },
  scrollContainer: {
    paddingHorizontal: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  menuText: {
    color: '#8b9dc3',
    fontSize: 14,
  },
  arrowIcon: {
    marginLeft: 'auto',
  },
  submenu: {
    paddingLeft: 35,
    marginTop: -5,
    marginBottom: 10,
  },
  submenuItem: {
    paddingVertical: 5,
  },
  submenuText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  logoutContainer: {
    padding: 10,
  },
});
