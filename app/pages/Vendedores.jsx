// app/pages/Vendedores.jsx
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput as PaperInput } from 'react-native-paper';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabase';

export default function Vendedores() {
  const [vendedores, setVendedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoExportar, setCargandoExportar] = useState(false);
  const [form, setForm] = useState({
    id: null,
    nombre: '',
  });

  useEffect(() => {
    fetchVendedores();
  }, []);

  const fetchVendedores = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('vendedores')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        Alert.alert('Error', 'No se pudieron cargar los vendedores');
        console.error('Error fetching vendedores:', error);
        return;
      }

      setVendedores(data || []);
    } catch (error) {
      console.error('Error en fetchVendedores:', error);
      Alert.alert('Error', 'Error inesperado al cargar vendedores');
    } finally {
      setCargando(false);
    }
  };

  const vendedoresFiltrados = vendedores.filter((v) =>
    v.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const resetForm = () => {
    setForm({
      id: null,
      nombre: '',
    });
    setMostrarFormulario(false);
  };

  const handleGuardar = async () => {
    const { nombre, id } = form;

    if (!nombre.trim()) {
      return Alert.alert('Campos requeridos', 'El nombre es obligatorio.');
    }

    try {
      setCargando(true);
      const dataEnviar = {
        nombre: nombre.trim(),
      };

      const { error } = id
        ? await supabase.from('vendedores').update(dataEnviar).eq('id', id)
        : await supabase.from('vendedores').insert([dataEnviar]);

      if (error) {
        Alert.alert('Error', 'No se pudo guardar el vendedor.');
        console.error('Error saving vendedor:', error);
        return;
      }

      Alert.alert('Éxito', id ? 'Vendedor actualizado correctamente' : 'Vendedor creado correctamente');
      resetForm();
      fetchVendedores();
    } catch (error) {
      console.error('Error en handleGuardar:', error);
      Alert.alert('Error', 'Error inesperado al guardar el vendedor.');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este vendedor? Esto puede afectar a clientes asociados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              const { error } = await supabase.from('vendedores').delete().eq('id', id);

              if (error) {
                Alert.alert('Error', 'No se pudo eliminar el vendedor.');
                console.error('Error deleting vendedor:', error);
                return;
              }

              Alert.alert('Éxito', 'Vendedor eliminado correctamente');
              fetchVendedores();
            } catch (error) {
              console.error('Error en handleEliminar:', error);
              Alert.alert('Error', 'Error inesperado al eliminar el vendedor.');
            } finally {
              setCargando(false);
            }
          },
        },
      ]
    );
  };

  const exportarExcel = async () => {
    try {
      setCargandoExportar(true);

      if (vendedoresFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay vendedores para exportar.');
        return;
      }

      const datos = vendedoresFiltrados.map(({ id, nombre }) => ({ nombre }));
      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendedores');

      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + 'vendedores.xlsx';

      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      Alert.alert('Error', 'No se pudo exportar el archivo Excel.');
    } finally {
      setCargandoExportar(false);
    }
  };

  const exportarPDF = async () => {
    try {
      setCargandoExportar(true);

      if (vendedoresFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay vendedores para exportar.');
        return;
      }

      let html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .total { font-weight: bold; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>Lista de Vendedores</h1>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                </tr>
              </thead>
              <tbody>
      `;

      vendedoresFiltrados.forEach((v) => {
        html += `
          <tr>
            <td>${v.nombre}</td>
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
            <div class="total">Total de vendedores: ${vendedoresFiltrados.length}</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error exportando PDF:', error);
      Alert.alert('Error', 'No se pudo exportar el archivo PDF.');
    } finally {
      setCargandoExportar(false);
    }
  };

  const editarVendedor = (vendedor) => {
    setForm({
      id: vendedor.id,
      nombre: vendedor.nombre,
    });
    setMostrarFormulario(true);
  };

  const inputTheme = {
    colors: { primary: '#3b82f6', text: '#fff', placeholder: '#ccc' },
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 Lista de Vendedores</Text>

      <View style={styles.buscador}>
        <Ionicons name="search" size={20} color="#ccc" />
        <TextInput
          placeholder="Buscar por nombre"
          placeholderTextColor="#ccc"
          style={styles.inputText}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <View style={styles.botoneraDerecha}>
        <TouchableOpacity
          style={styles.botonAgregar}
          onPress={() => setMostrarFormulario(true)}
          disabled={cargando}
        >
          <Text style={styles.botonTexto}>➕ Agregar Vendedor</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={exportarExcel}
          style={styles.btnExportarExcel}
          disabled={cargandoExportar}
        >
          {cargandoExportar ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.botonTexto}>📊 Excel</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={exportarPDF}
          style={styles.btnExportarPDF}
          disabled={cargandoExportar}
        >
          {cargandoExportar ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.botonTexto}>📄 PDF</Text>
          )}
        </TouchableOpacity>
      </View>

      {mostrarFormulario && (
        <View style={styles.formulario}>
          <Text style={styles.formTitulo}>{form.id ? 'Editar Vendedor' : 'Nuevo Vendedor'}</Text>

          <PaperInput
            label="Nombre *"
            value={form.nombre}
            onChangeText={(text) => handleChange('nombre', text)}
            mode="outlined"
            style={styles.input}
            theme={inputTheme}
            textColor="#ffffff"
            disabled={cargando}
          />

          <View style={styles.botonesForm}>
            <TouchableOpacity
              style={styles.btnGuardar}
              onPress={handleGuardar}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.botonTexto}>{form.id ? 'Actualizar' : 'Guardar'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={resetForm}
              disabled={cargando}
            >
              <Text style={styles.botonTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {cargando && !mostrarFormulario && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      )}

      <ScrollView style={styles.lista}>
        {vendedoresFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {busqueda ? 'No se encontraron vendedores con esa búsqueda' : 'No hay vendedores registrados'}
            </Text>
          </View>
        ) : (
          vendedoresFiltrados.map((v) => (
            <View key={v.id} style={styles.card}>
              <Text style={styles.nombre}>{v.nombre}</Text>
              <View style={styles.botonesCard}>
                <TouchableOpacity
                  onPress={() => editarVendedor(v)}
                  style={styles.btnEditar}
                  disabled={cargando}
                >
                  <Text style={styles.botonTexto}>✏️ EDITAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleEliminar(v.id)}
                  style={styles.btnEliminar}
                  disabled={cargando}
                >
                  <Text style={styles.botonTexto}>🗑️ Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 10 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  buscador: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  inputText: { color: '#fff', flex: 1, paddingVertical: 10, marginLeft: 6 },
  botoneraDerecha: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  botonAgregar: {
    backgroundColor: '#0bab64',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnExportarExcel: {
    backgroundColor: '#3b82f6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  btnExportarPDF: {
    backgroundColor: '#f59e0b',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  btnEliminar: {
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnEditar: {
    backgroundColor: '#eab308',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
  formulario: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  formTitulo: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  botonesForm: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  btnGuardar: {
    backgroundColor: '#3b82f6',
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCancelar: {
    backgroundColor: '#ef4444',
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  lista: { marginTop: 10 },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  nombre: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  info: { color: '#cbd5e1', marginTop: 4 },
  botonesCard: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  input: {
    backgroundColor: '#1e293b',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
  },
});