// app/pages/DashboardUsuario.jsx
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import LogoutButton from '../components/LogoutButton';
import Clientes from '../pages/clientes';
import CuentasPorCobrar from '../pages/CuentasPorCobrar';
import Pedidos from '../pages/Pedidos';
import Celofan from './Productos/celofan';
import Polietileno from './Productos/polietileno';

const useResponsive = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  return {
    width: dimensions.width,
    height: dimensions.height,
    isPhone: dimensions.width < 768,
    isTablet: dimensions.width >= 768 && dimensions.width < 1024,
    isDesktop: dimensions.width >= 1024,
  };
};

const TypingIndicator = () => {
  const [dotOpacity, setDotOpacity] = useState([1, 0.5, 0.3]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotOpacity(prev => [prev[2], prev[0], prev[1]]);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.typingIndicator}>
      <Text style={styles.mensajeTexto}>IA está escribiendo</Text>
      <View style={styles.typingDots}>
        {dotOpacity.map((opacity, index) => (
          <View key={index} style={[styles.typingDot, { opacity }]} />
        ))}
      </View>
    </View>
  );
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DashboardUsuario() {
  const { correo } = useLocalSearchParams();
  const router = useRouter();
  const { width, height, isPhone, isTablet, isDesktop } = useResponsive();
  const [iaEscribiendo, setIaEscribiendo] = useState(false);
  const [contenidoActual, setContenidoActual] = useState('/pages/DashboardUsuario');
  const [sidebarExpanded, setSidebarExpanded] = useState(!isPhone);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mensajes, setMensajes] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (isPhone) {
      setSidebarExpanded(false);
    } else {
      setDrawerVisible(false);
    }
  }, [isPhone]);

  const toggleMenu = (menu) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  const handleSidebarToggle = () => {
    if (isPhone) {
      setDrawerVisible(!drawerVisible);
    } else {
      setSidebarExpanded(!sidebarExpanded);
    }
  };

  const handleMenuItemPress = (ruta) => {
    setContenidoActual(ruta);
    if (isPhone) {
      setDrawerVisible(false);
    }
  };

  const handleEnviarMensaje = async () => {
    if (!mensaje.trim()) return;

    const texto = mensaje.trim();
    setMensajes((prev) => [...prev, { texto, propio: true }]);
    setMensaje('');
    setIaEscribiendo(true);

    try {
      let chatId = await AsyncStorage.getItem('chatId');
      if (!chatId) {
        chatId = 'chat_' + Math.random().toString(36).substring(2, 10);
        await AsyncStorage.setItem('chatId', chatId);
      }

      const response = await fetch('https://n8n.varac.io/webhook/2db75189-bd6e-4538-a194-51b2cf09a77a/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          message: texto,
          route: 'general',
        }),
      });

      const data = await response.json();
      const respuesta = data.output || '🤖 Lo siento, no entendí eso.';
      setTimeout(() => {
        setIaEscribiendo(false);
        setMensajes((prev) => [...prev, { texto: respuesta, propio: false }]);
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 1000);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setTimeout(() => {
        setIaEscribiendo(false);
        setMensajes((prev) => [
          ...prev,
          { texto: '❌ Error al conectar con el asistente.', propio: false },
        ]);
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 1000);
    }
  };

  const menuItems = [
    { nombre: 'Panel', icono: 'home', ruta: '/pages/DashboardUsuario' },
    {
      nombre: 'Productos', icono: 'box-open', hijos: [
        { nombre: 'Celofán', ruta: '/pages/productos/celofan' },
        { nombre: 'Polietileno', ruta: '/pages/productos/polietileno' },
      ]
    },
    { nombre: 'Pedidos', icono: 'shopping-cart', ruta: '/pages/pedidos' },
    { nombre: 'Clientes', icono: 'user-friends', ruta: '/pages/clientes' },
    { nombre: 'Cuentas por Cobrar', icono: 'wallet', ruta: '/pages/CuentasPorCobrar' },
  ];

  const getResponsiveStyles = () => {
    const headerHeight = isPhone ? 60 : 70;
    const sidebarWidth = isPhone ? width * 0.75 : (isTablet ? 240 : 260);
    const contentPadding = isPhone ? 16 : (isTablet ? 24 : 50);
    const contentHorizontalPadding = isPhone ? 16 : (isTablet ? 32 : 80);
    
    return StyleSheet.create({
      container: {
        flexDirection: isPhone ? 'column' : 'row',
        height: '100%',
        backgroundColor: '#0b1120',
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e293b',
        paddingVertical: 10,
        paddingHorizontal: isPhone ? 16 : 20,
        borderBottomColor: '#334155',
        borderBottomWidth: 1,
        zIndex: 999,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: headerHeight,
      },
      headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      headerLogo: {
        width: isPhone ? 40 : 30,
        height: isPhone ? 24 : 30,
        marginRight: 10,
        borderRadius: 6,
      },
      headerTitle: {
        color: '#fff',
        fontSize: isPhone ? 18 : 20,
        fontWeight: 'bold',
      },
      profileImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#fff',
      },
      profileMenu: {
        position: 'absolute',
        top: headerHeight,
        right: 20,
        backgroundColor: '#1e293b',
        padding: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
      },
      menuItemText: {
        color: '#fff',
        fontSize: 14,
        paddingVertical: 6,
      },
      sidebar: {
        backgroundColor: '#1e293b',
        paddingTop: headerHeight + 10,
        justifyContent: 'space-between',
        width: sidebarWidth,
        height: isPhone ? 'auto' : '100%',
        borderRightWidth: 1,
        borderRightColor: '#334155',
      },
      sidebarExpanded: {
        width: sidebarWidth,
      },
      sidebarCollapsed: {
        width: isPhone ? 0 : 60,
      },
      drawerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-start',
        paddingTop: headerHeight,
      },
      drawerContent: {
        backgroundColor: '#1e293b',
        width: sidebarWidth,
        height: '100%',
        paddingTop: 15,
        borderRightWidth: 1,
        borderRightColor: '#334155',
      },
      sidebarScroll: {
        paddingHorizontal: 8,
        paddingVertical: 5,
      },
      menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 5,
        marginVertical: 6,
        borderRadius: 8,
        minHeight: 40,
      },
      menuItemActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderLeftWidth: 3,
        borderLeftColor: '#3b82f6',
      },
      menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
      },
      iconOnly: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      },
      icon: {
        marginRight: sidebarExpanded ? 10 : 0,
        textAlign: 'center',
        width: 16,
      },
      menuText: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
      },
      arrowIcon: {
        marginLeft: 8,
        width: 12,
      },
      submenu: {
        marginLeft: 8,
        marginTop: 2,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderRadius: 6,
        paddingVertical: 4,
      },
      submenuItem: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginVertical: 1,
        borderRadius: 4,
        minHeight: 36,
        flexDirection: 'row',
        alignItems: 'center',
      },
      submenuItemActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
      },
      submenuText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '400',
        marginLeft: 4,
      },
      submenuDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#64748b',
        marginRight: 8,
      },
      logoutContainer: {
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#334155',
        marginTop: 10,
      },
      floatingToggle: {
        position: 'absolute',
        top: isPhone ? headerHeight + 10 : '90%',
        left: isPhone ? 20 : (sidebarExpanded ? sidebarWidth - 20 : 40),
        transform: [{ translateY: -20 }],
        zIndex: 1000,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      toggleSidebarBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 0,
        shadowColor: 'transparent',
      },
      content: {
        flex: 1,
        padding: contentPadding,
        backgroundColor: '#0f172a',
        paddingHorizontal: contentHorizontalPadding,
        paddingTop: headerHeight + contentPadding,
        marginRight: (chatVisible && !isPhone) ? 280 : 0,
      },
      welcomeCard: {
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#334155',
      },
      welcomeText: {
        color: '#fff',
        fontSize: isPhone ? 18 : 20,
        fontWeight: 'bold',
      },
      welcomeCorreo: {
        color: '#94a3b8',
        fontSize: isPhone ? 13 : 14,
        marginTop: 4,
      },
      cardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: isPhone ? 8 : 12,
      },
      statCard: {
        backgroundColor: '#1e293b',
        padding: isPhone ? 25 : 16,
        borderRadius: 18,
        width: '31%',
        alignItems: 'center',
        marginBottom: isPhone ? 8 : 12,
        borderWidth: 1,
        borderColor: '#334155',
        minHeight: isPhone ? 80 : 100,
      },
      statLabel: {
        color: '#94a3b8',
        fontSize: isPhone ? 11 : 14,
        marginTop: isPhone ? 4 : 8,
        textAlign: 'center',
      },
      statValue: {
        color: '#fff',
        fontSize: isPhone ? 14 : 18,
        fontWeight: 'bold',
        marginTop: 4,
        textAlign: 'center',
      },
      botonToggleChat: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        backgroundColor: '#3b82f6',
        padding: 12,
        borderRadius: 12,
        zIndex: 999,
        minWidth: 44,
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      chatPanel: {
        position: 'absolute',
        right: 0,
        top: headerHeight,
        bottom: 0,
        width: isPhone ? '100%' : (isTablet ? '50%' : 280),
        backgroundColor: '#1e293b',
        padding: 15,
        zIndex: 998,
        borderLeftWidth: 1,
        borderLeftColor: '#334155',
      },
      chatTitle: {
        color: '#fff',
        fontSize: isPhone ? 18 : 20,
        fontWeight: 'bold',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
      },
      chatMensajes: {
        flex: 1,
        marginBottom: 10,
      },
      mensaje: {
        padding: 10,
        marginVertical: 4,
        marginHorizontal: 6,
        borderRadius: 12,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      },
      mensajePropio: {
        backgroundColor: '#3b82f6',
        alignSelf: 'flex-end',
        borderTopRightRadius: 4,
      },
      mensajeOtro: {
        backgroundColor: '#334155',
        alignSelf: 'flex-start',
        borderTopLeftRadius: 4,
      },
      mensajeTexto: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 18,
      },
      chatInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#334155',
        borderRadius: 80,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 50,
        maxHeight: 120,
        borderWidth: 5,
        borderColor: '#475569',
      },
      chatInput: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        paddingRight: 8,
        paddingVertical: 8,
        textAlignVertical: 'top',
        maxHeight: 100,
      },
      botonCerrarChat: {
        position: 'absolute',
        top: 5,
        right: 10,
        zIndex: 999,
        backgroundColor: '#475569',
        padding: 8,
        borderRadius: 6,
        minWidth: 32,
        minHeight: 32,
        justifyContent: 'center',
        alignItems: 'center',
      },
      typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginVertical: 4,
        marginHorizontal: 6,
        backgroundColor: '#334155',
        borderRadius: 12,
        maxWidth: '80%',
        alignSelf: 'flex-start',
      },
      typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
      },
      typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#94a3b8',
        marginHorizontal: 2,
      },
    });
  };

  const styles = getResponsiveStyles();

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {isPhone && (
          <TouchableOpacity 
            onPress={handleSidebarToggle}
            style={{ marginRight: 15, minWidth: 44, minHeight: 44, justifyContent: 'center' }}
          >
            <FontAwesome5 name="bars" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        <Image source={require('../../assets/logo1.png')} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>AIKZ</Text>
      </View>

      <TouchableOpacity onPress={() => setOpenMenu(openMenu === 'perfil' ? null : 'perfil')}>
        <Image
          source={{ uri: 'https://ui-avatars.com/api/?name=Usuario&background=0D8ABC&color=fff' }}
          style={styles.profileImage}
        />
      </TouchableOpacity>

      {openMenu === 'perfil' && (
        <View style={styles.profileMenu}>
          <TouchableOpacity 
            onPress={() => {
              setOpenMenu(null);
              router.replace('/');
            }}
            style={{ minHeight: 44 }}
          >
            <Text style={styles.menuItemText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const SidebarContent = ({ onItemPress }) => (
    <ScrollView contentContainerStyle={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
      {menuItems.map((item, index) => (
        <View key={index}>
          <TouchableOpacity
            onPress={() => {
              if (item.hijos) {
                toggleMenu(item.nombre);
              } else {
                onItemPress(item.ruta);
              }
            }}
            style={[
              styles.menuItem,
              contenidoActual === item.ruta && styles.menuItemActive
            ]}
          >
            <View style={[styles.menuLeft, !sidebarExpanded && styles.iconOnly]}>
              <FontAwesome5 
                name={item.icono} 
                size= {14} 
                color={contenidoActual === item.ruta ? '#3b82f6' : '#94a3b8'} 
                style={styles.icon} 
              />
              {(sidebarExpanded || isPhone) && (
                <Text style={[
                  styles.menuText,
                  contenidoActual === item.ruta && { color: '#3b82f6' }
                ]}>
                  {item.nombre}
                </Text>
              )}
            </View>
            {(sidebarExpanded || isPhone) && item.hijos && (
              <FontAwesome5
                name={openMenu === item.nombre ? 'chevron-down' : 'chevron-right'}
                size={10}
                color="#94a3b8"
                style={styles.arrowIcon}
              />
            )}
          </TouchableOpacity>
          
          {(sidebarExpanded || isPhone) && item.hijos && openMenu === item.nombre && (
            <View style={styles.submenu}>
              {item.hijos.map((sub, i) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => onItemPress(sub.ruta)} 
                  style={[
                    styles.submenuItem,
                    contenidoActual === sub.ruta && styles.submenuItemActive
                  ]}
                >
                  <View style={styles.submenuDot} />
                  <Text style={[
                    styles.submenuText,
                    contenidoActual === sub.ruta && { color: '#3b82f6' }
                  ]}>
                    {sub.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const MobileDrawer = () => (
    <Modal
      visible={drawerVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setDrawerVisible(false)}
    >
      <TouchableOpacity 
        style={styles.drawerOverlay}
        activeOpacity={1}
        onPress={() => setDrawerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.drawerContent}
          activeOpacity={1}
        >
          <SidebarContent onItemPress={handleMenuItemPress} />
          <View style={styles.logoutContainer}>
            <LogoutButton />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Header />

      {isPhone && <MobileDrawer />}

      {!isPhone && (
        <View style={[styles.sidebar, sidebarExpanded ? styles.sidebarExpanded : styles.sidebarCollapsed]}>
          <SidebarContent onItemPress={setContenidoActual} />
          <View style={styles.logoutContainer}>
            <LogoutButton />
          </View>
        </View>
      )}

      {!isPhone && (
        <Animatable.View
          animation="pulse"
          duration={300}
          iterationCount={1}
          style={styles.floatingToggle}
        >
          <TouchableOpacity onPress={handleSidebarToggle}>
            <LinearGradient
              colors={['rgba(59,130,246,0.5)', '#1e293b']}
              locations={[0, 0.4]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 0 }}
              style={styles.toggleSidebarBtn}
            >
              <Animatable.View
                animation={sidebarExpanded ? 'rotate' : 'rotate'}
                duration={300}
                key={sidebarExpanded ? 'left' : 'right'}
              >
                <FontAwesome5
                  name={sidebarExpanded ? 'chevron-left' : 'chevron-right'}
                  size={16}
                  color="#ffffff"
                />
              </Animatable.View>
            </LinearGradient>
          </TouchableOpacity>
        </Animatable.View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {contenidoActual === '/pages/DashboardUsuario' && (
          <Animatable.View animation="fadeInDown" duration={600} style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>👋 Bienvenido, </Text>
            <Text style={styles.welcomeCorreo}>{correo}</Text>
          </Animatable.View>
        )}

        {contenidoActual === '/pages/DashboardUsuario' && (
          <View style={styles.cardGrid}>
            <Animatable.View animation="fadeInUp" delay={200} style={styles.statCard}>
              <FontAwesome5 name="users" size={24} color="#3b82f6" />
              <Text style={styles.statLabel}>Clientes</Text>
              <Text style={styles.statValue}>111</Text>
            </Animatable.View>

            <Animatable.View animation="fadeInUp" delay={300} style={styles.statCard}>
              <FontAwesome5 name="shopping-cart" size={24} color="#22c55e" />
              <Text style={styles.statLabel}>Pedidos</Text>
              <Text style={styles.statValue}>87</Text>
            </Animatable.View>

            <Animatable.View animation="fadeInUp" delay={400} style={styles.statCard}>
              <FontAwesome5 name="wallet" size={24} color="#facc15" />
              <Text style={styles.statLabel}>Cuentas por Cobrar</Text>
              <Text style={styles.statValue}>$10.5M</Text>
            </Animatable.View>
          </View>
        )}

        {contenidoActual === '/pages/clientes' && <Clientes />}
        {contenidoActual === '/pages/pedidos' && <Pedidos />}
        {contenidoActual === '/pages/CuentasPorCobrar' && <CuentasPorCobrar />}
        {contenidoActual === '/pages/productos/celofan' && <Celofan />}
        {contenidoActual === '/pages/productos/polietileno' && <Polietileno />}
      </ScrollView>

      {!chatVisible && (
        <TouchableOpacity style={styles.botonToggleChat} onPress={() => setChatVisible(true)}>
          <FontAwesome5 name="comments" solid size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {chatVisible && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatPanel}
        >
          <TouchableOpacity 
            style={styles.botonCerrarChat} 
            onPress={() => setChatVisible(false)}
          >
            <FontAwesome5 name={isPhone ? 'times' : 'chevron-right'} size={12} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.chatTitle}>🤖 Asistente IA</Text>

          <ScrollView 
            style={styles.chatMensajes} 
            showsVerticalScrollIndicator={false}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {mensajes.map((msg, index) => (
              <View key={index} style={[styles.mensaje, msg.propio ? styles.mensajePropio : styles.mensajeOtro]}>
                <Text style={styles.mensajeTexto}>{msg.texto}</Text>
              </View>
            ))}
            {iaEscribiendo && <TypingIndicator />}
          </ScrollView>
          <View style={styles.chatInputContainer}>
            <TextInput
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#94a3b8"
              value={mensaje}
              onChangeText={setMensaje}
              style={styles.chatInput}
              multiline
              numberOfLines={1}
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleEnviarMensaje}
              blurOnSubmit={false}
            />
            <TouchableOpacity 
              onPress={handleEnviarMensaje}
              style={{ minWidth: 36, minHeight: 36, justifyContent: 'center', alignItems: 'center' }}
            >
              <FontAwesome5 name="paper-plane" size={14} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}