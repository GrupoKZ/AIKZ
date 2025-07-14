import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ChatPanel({ visible, toggle }) {
  if (!visible) {
    return (
      <TouchableOpacity onPress={toggle} style={styles.openButton}>
        <Ionicons name="chevron-forward-circle" size={28} color="#38bdf8" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.chatContainer}>
      <TouchableOpacity onPress={toggle} style={styles.closeButton}>
        <Ionicons name="chevron-back-circle" size={28} color="#38bdf8" />
      </TouchableOpacity>
      <Text style={styles.chatTitle}>💬 Chat Soporte</Text>
      {/* Aquí va el contenido del chat */}
    </View>
  );
}

const styles = StyleSheet.create({
  openButton: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  chatContainer: {
    width: 280,
    backgroundColor: '#1e293b',
    padding: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  chatTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginVertical: 10,
  },
});
