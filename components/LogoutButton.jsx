// components/LogoutButton.jsx
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    // Aquí puedes limpiar el auth, tokens, etc.
    router.replace('/'); // o donde vaya el login
  };

  return (
    <TouchableOpacity onPress={handleLogout} style={styles.button}>
      <Text style={styles.text}>Cerrar sesión</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
