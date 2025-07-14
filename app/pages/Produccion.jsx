import { Picker } from '@react-native-picker/picker';
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

export default function Produccion() {
  const [producciones, setProducciones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(false);

  const [form, setForm] = useState({
    id: null,
    fecha: '',
    turno: '',
    maquina: '',
    material: '',
    producto_id: '',
    cantidad: '',
  });

  useEffect(() => {
    fetchProduccion();
    fetchProductos();
  }, []);

  const fetchProduccion = async () => {
    const { data, error } = await supabase.from('produccion').select('*').order('id', { ascending: false });
    if (!error) setProducciones(data);
  };

  const fetchProductos = async () => {
    const { data, error } = await supabase.from('productos').select('id, nombre');
    if (!error) setProductos(data);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      id: null,
      fecha: '',
      turno: '',
      maquina: '',
      material: '',
      producto_id: '',
      cantidad: '',
    });
    setEditando(false);
    setMostrarFormulario(false);
  };

  const handleGuardar = async () => {
    if (!form.fecha || !form.turno || !form.material || !form.producto_id || !form.cantidad) {
      Alert.alert('Error', 'Todos los campos obligatorios deben estar completos');
      return;
    }

    const payload = {
      fecha: form.fecha,
      turno: form.turno,
      maquina: form.maquina || null,
      material: form.material,
      producto_id: parseInt(form.producto_id),
      cantidad: parseFloat(form.cantidad),
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from('produccion').update(payload).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('produccion').insert([payload]));
    }

    if (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar');
    } else {
      Alert.alert('Éxito', form.id ? 'Producción actualizada' : 'Producción registrada');
      resetForm();
      fetchProduccion();
    }
  };

  const handleEditar = (item) => {
    setForm({ ...item, producto_id: item.producto_id?.toString() });
    setEditando(true);
    setMostrarFormulario(true);
  };

  const handleEliminar = async (id) => {
    const { error } = await supabase.from('produccion').delete().eq('id', id);
    if (!error) fetchProduccion();
  };

  return (
    <View style={{ flexDirection: 'row', flex: 1 }}>
      {/* SIDEBAR */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarText}>Menú</Text>
        <TouchableOpacity><Text style={styles.sidebarItem}>Clientes</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.sidebarItem}>Productos</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.sidebarItem}>Producción</Text></TouchableOpacity>
      </View>

      {/* CONTENIDO */}
      <ScrollView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Producción</Text>
          <TouchableOpacity style={styles.saveButton} onPress={() => {
            resetForm();
            setMostrarFormulario(true);
          }}>
            <Text style={styles.saveButtonText}>Agregar Producción</Text>
          </TouchableOpacity>
        </View>

        {mostrarFormulario && (
          <>
            <TextInput style={styles.input} placeholder="Fecha (YYYY-MM-DD)" value={form.fecha} onChangeText={(text) => handleChange('fecha', text)} />

            <View style={styles.input}>
              <Picker selectedValue={form.turno} onValueChange={(value) => handleChange('turno', value)}>
                <Picker.Item label="Selecciona turno" value="" />
                <Picker.Item label="Mañana" value="Mañana" />
                <Picker.Item label="Tarde" value="Tarde" />
                <Picker.Item label="Noche" value="Noche" />
              </Picker>
            </View>

            <TextInput style={styles.input} placeholder="Máquina" value={form.maquina} onChangeText={(text) => handleChange('maquina', text)} />

            <View style={styles.input}>
              <Picker selectedValue={form.material} onValueChange={(value) => handleChange('material', value)}>
                <Picker.Item label="Selecciona material" value="" />
                <Picker.Item label="Polietileno" value="Polietileno" />
                <Picker.Item label="Celofán" value="Celofán" />
              </Picker>
            </View>

            <View style={styles.input}>
              <Picker selectedValue={form.producto_id} onValueChange={(value) => handleChange('producto_id', value)}>
                <Picker.Item label="Selecciona producto" value="" />
                {productos.map(p => (
                  <Picker.Item key={p.id} label={p.nombre} value={p.id.toString()} />
                ))}
              </Picker>
            </View>

            <TextInput style={styles.input} placeholder="Cantidad" value={form.cantidad} onChangeText={(text) => handleChange('cantidad', text)} keyboardType="numeric" />

            <TouchableOpacity style={styles.saveButton} onPress={handleGuardar}>
              <Text style={styles.saveButtonText}>{editando ? 'Actualizar' : 'Guardar'} Producción</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}

        {producciones.map((item) => {
          const productoNombre = productos.find(p => p.id === item.producto_id)?.nombre || 'Desconocido';
          return (
            <View key={item.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Fecha: {item.fecha}</Text>
                <Text style={styles.cardText}>Turno: {item.turno} | Material: {item.material}</Text>
                <Text style={styles.cardText}>Producto: {productoNombre} | Cantidad: {item.cantidad}</Text>
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
          );
        })}
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
    paddingHorizontal: 10,
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
