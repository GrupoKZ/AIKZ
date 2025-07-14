// app/components/LogoutButton.jsx
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../../supabase/client';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <TouchableOpacity onPress={handleLogout}>
      <LinearGradient
        colors={['#3bb78f', '#0bab64']}
        style={styles.button}
      >
        <FontAwesome5 name="sign-out-alt" size={16} color="#fff" />
        <Text style={styles.buttonText}>Cerrar Sesión</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});