import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { supabase } from '../../supabase/client';


export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const router = useRouter();

 const handleLogin = async () => {
  const { error, data } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });

  if (error) {
    Alert.alert('Error', error.message);
    return;
  }

  const userId = data.user.id;

  // Buscar en la tabla 'usuarios' usando el auth_uid
  const { data: perfil, error: errorPerfil } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('auth_uid', userId)
    .single();

  if (errorPerfil || !perfil) {
    Alert.alert('Error', 'No se encontró el perfil del usuario.');
    return;
  }

  // Redirigir según el rol
 if (perfil.rol?.toLowerCase().trim() === 'administrador') {
  router.replace(`/pages/DashboardAdmin?correo=${correo}`);
} else {
  router.replace(`/pages/DashboardUsuario?correo=${correo}`);
}
};
   
  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <Animatable.View
        animation="fadeInUp"
        delay={200}
        duration={800}
        style={styles.card}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="correo@ejemplo.com"
          placeholderTextColor="#888"
          onChangeText={setCorreo}
          value={correo}
          keyboardType="email-address"
        />
        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••"
          placeholderTextColor="#888"
          onChangeText={setContrasena}
          value={contrasena}
          secureTextEntry
        />
        <TouchableOpacity onPress={handleLogin} style={{ width: '100%' }}>
          <LinearGradient
            colors={['#3bb78f', '#0bab64']}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Entrar</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animatable.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#0b132b',
    padding: 30,
    borderRadius: 12,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 10,
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 30,
  },
  label: {
    alignSelf: 'flex-start',
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#1c2541',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    marginBottom: 5,
  },
  button: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
