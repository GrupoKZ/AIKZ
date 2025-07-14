import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../supabase';

export default function Entregas() {
  const [entregas, setEntregas] = useState([]);
  const [form, setForm] = useState({
    id: null,
    nota_venta_id: '',
    producto_id: '',
    cantidad: '',
    unidades: '',
    fecha_entrega: '',
  });
  const [editando, setEditando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    fetchEntregas();
  }, []);

  const fetchEntregas = async () => {
    const { data, error } = await supabase.from('entregas').select('*').order('id', { ascending: false });
    if (!error) setEntregas(data);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      id: null,
      nota_venta_id: '',
      producto_id: '',
      cantidad: '',
      unidades: '',
      fecha_entrega: '',
    });
    setEditando(false);
    setMostrarFormulario(false);
  };

  const handleGuardar = async () => {
    try {
      const payload = {
        nota_venta_id: parseInt(form.nota_venta_id),
        producto_id: parseInt(form.producto_id),
        cantidad: parseFloat(form.cantidad),
        unidades: form.unidades,
        fecha_entrega: form.fecha_entrega,
      };

      let error;
      if (form.id) {
        ({ error } = await supabase.from('entregas').update(payload).eq('id', form.id));
      } else {
        ({ error } = await supabase.from('entregas').insert([payload]));
      }

      if (error) throw error;

      Alert.alert('Listo', form.id ? 'Entrega actualizada' : 'Entrega agregada');
      resetForm();
      fetchEntregas();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleEditar = (item) => {
    setForm({ ...item });
    setEditando(true);
    setMostrarFormulario(true);
  };

  const handleEliminar = async (id) => {
    const { error } = await supabase.from('entregas').delete().eq('id', id);
    if (!error) fetchEntregas();
  };

  return (
    <View style={{ flexDirection: 'row', flex: 1 }}>
      <View style={styles.sidebar}>
        <Text style={styles.sidebarText}>Menú</Text>
        <TouchableOpacity><Text style={styles.sidebarItem}>Clientes</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.sidebarItem}>Productos</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.sidebarItem}>Entregas</Text></TouchableOpacity>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Entregas</Text>
          <TouchableOpacity style={styles.saveButton} onPress={() => {
            resetForm();
            setMostrarFormulario(true);
          }}>
            <Text style={styles.saveButtonText}>Agregar Entrega</Text>
          </TouchableOpacity>
        </View>

        {mostrarFormulario && (
          <>
            <TextInput style={styles.input} placeholder="Nota Venta ID" value={form.nota_venta_id} onChangeText={(text) => handleChange('nota_venta_id', text)} />
            <TextInput style={styles.input} placeholder="Producto ID" value={form.producto_id} onChangeText={(text) => handleChange('producto_id', text)} />
            <TextInput style={styles.input} placeholder="Cantidad" value={form.cantidad} onChangeText={(text) => handleChange('cantidad', text)} />
            <TextInput style={styles.input} placeholder="Unidades" value={form.unidades} onChangeText={(text) => handleChange('unidades', text)} />
            <TextInput style={styles.input} placeholder="Fecha Entrega (YYYY-MM-DD)" value={form.fecha_entrega} onChangeText={(text) => handleChange('fecha_entrega', text)} />

            <TouchableOpacity style={styles.saveButton} onPress={handleGuardar}>
              <Text style={styles.saveButtonText}>{editando ? 'Actualizar' : 'Guardar'} Entrega</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}

        {entregas.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Producto ID: {item.producto_id}</Text>
              <Text style={styles.cardText}>Cantidad: {item.cantidad} {item.unidades}</Text>
              <Text style={styles.cardText}>Nota Venta ID: {item.nota_venta_id}</Text>
              <Text style={styles.cardText}>Fecha: {item.fecha_entrega ? new Date(item.fecha_entrega).toLocaleDateString() : 'Sin fecha'}</Text>
            </View>
            <View style={styles.cardButtons}>
              <TouchableOpacity style={styles.editButton} onPress={() => handleEditar(item)}>
                <Text style={styles.buttonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleEliminar(item.id)}>
                <Text style={styles.buttonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginVertical: 6,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  cancelButton: {
    backgroundColor: '#6b7280',
    padding: 10,
    marginTop: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: { color: 'white', fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 6,
    flexDirection: 'row',
    elevation: 2,
  },
  cardButtons: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardText: { fontSize: 12, color: '#555' },
  editButton: {
    backgroundColor: '#facc15',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 8,
    borderRadius: 6,
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  sidebar: {
    width: 180,
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  sidebarText: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 20,
  },
  sidebarItem: {
    fontSize: 16,
    paddingVertical: 10,
    color: '#1f2937',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
});
