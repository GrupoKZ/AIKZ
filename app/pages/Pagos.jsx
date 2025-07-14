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

export default function Pagos() {
  const [pagos, setPagos] = useState([]);
  const [notas, setNotas] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState(false);

  const [form, setForm] = useState({
    id: null,
    nota_venta_id: '',
    fecha: '',
    importe: '',
    foto_comprobante: ''
  });

  useEffect(() => {
    fetchPagos();
    fetchNotasVenta();
  }, []);

  const fetchPagos = async () => {
    const { data, error } = await supabase.from('pagos').select('*').order('id', { ascending: false });
    if (!error) setPagos(data);
  };

  const fetchNotasVenta = async () => {
    const { data, error } = await supabase.from('notas_venta').select('id, cliente');
    if (!error) setNotas(data);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      id: null,
      nota_venta_id: '',
      fecha: '',
      importe: '',
      foto_comprobante: ''
    });
    setEditando(false);
    setMostrarFormulario(false);
  };

  const handleGuardar = async () => {
    if (!form.nota_venta_id || !form.fecha || !form.importe) {
      Alert.alert('Error', 'Todos los campos obligatorios deben estar completos');
      return;
    }

    const payload = {
      nota_venta_id: parseInt(form.nota_venta_id),
      fecha: form.fecha,
      importe: parseFloat(form.importe),
      foto_comprobante: form.foto_comprobante || null
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from('pagos').update(payload).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('pagos').insert([payload]));
    }

    if (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar');
    } else {
      Alert.alert('Éxito', form.id ? 'Pago actualizado' : 'Pago registrado');
      resetForm();
      fetchPagos();
    }
  };

  const handleEditar = (item) => {
    setForm({
      ...item,
      nota_venta_id: item.nota_venta_id?.toString() ?? ''
    });
    setEditando(true);
    setMostrarFormulario(true);
  };

  const handleEliminar = async (id) => {
    const { error } = await supabase.from('pagos').delete().eq('id', id);
    if (!error) fetchPagos();
  };

  return (
    <View style={{ flexDirection: 'row', flex: 1 }}>
      <View style={styles.sidebar}>
        <Text style={styles.sidebarText}>Menú</Text>
        <TouchableOpacity><Text style={styles.sidebarItem}>Clientes</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.sidebarItem}>Notas de Venta</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.sidebarItem}>Pagos</Text></TouchableOpacity>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Pagos</Text>
          <TouchableOpacity style={styles.saveButton} onPress={() => {
            resetForm();
            setMostrarFormulario(true);
          }}>
            <Text style={styles.saveButtonText}>Agregar Pago</Text>
          </TouchableOpacity>
        </View>

        {mostrarFormulario && (
          <>
            <Text style={styles.label}>Nota de Venta</Text>
            <select
              style={styles.input}
              value={form.nota_venta_id || ''}
              onChange={(e) => handleChange('nota_venta_id', e.target.value)}
            >
              <option value="">Seleccione una nota</option>
              {notas.map(n => (
                <option key={n.id} value={n.id}>
                  {n.id} - {n.cliente}
                </option>
              ))}
            </select>

            <TextInput style={styles.input} placeholder="Fecha (YYYY-MM-DD)" value={form.fecha} onChangeText={(text) => handleChange('fecha', text)} />
            <TextInput style={styles.input} placeholder="Importe" value={form.importe} onChangeText={(text) => handleChange('importe', text)} />
            <TextInput style={styles.input} placeholder="Foto Comprobante (URL o ID)" value={form.foto_comprobante} onChangeText={(text) => handleChange('foto_comprobante', text)} />

            <TouchableOpacity style={styles.saveButton} onPress={handleGuardar}>
              <Text style={styles.saveButtonText}>{editando ? 'Actualizar' : 'Guardar'} Pago</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}

        {pagos.map((item) => {
          const nota = notas.find(n => n.id === item.nota_venta_id);
          return (
            <View key={item.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Fecha: {item.fecha}</Text>
                <Text style={styles.cardText}>Nota: {item.nota_venta_id} - {nota?.cliente || 'Desconocido'}</Text>
                <Text style={styles.cardText}>Importe: ${item.importe}</Text>
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
    padding: 10,
    borderRadius: 6,
    marginVertical: 6,
  },
  label: { fontWeight: 'bold', marginTop: 10 },
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
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)', // Usando boxShadow en lugar de shadow*
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
