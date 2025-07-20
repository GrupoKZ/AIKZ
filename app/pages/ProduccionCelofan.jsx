// app/pages/ProduccionCelofan.jsx
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

export default function ProduccionCelofan() {
  const [producciones, setProducciones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoExportar, setCargandoExportar] = useState(false);
  const [form, setForm] = useState({
    id: null,
    fecha: new Date().toISOString().split('T')[0],
    turno: '',
    maquina: '',
    producto_id: '',
    millares: '0',
    operador: '',
  });

  const turnos = ['Matutino', 'Vespertino', 'Nocturno'];

  useEffect(() => {
    fetchProducciones();
    fetchProductos();
  }, []);

  const fetchProducciones = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('produccion_celofan')
        .select('*, productos(nombre)')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('Supabase error details (fetchProducciones):', error);
        throw new Error(`Error al consultar produccion_celofan: ${error.message}`);
      }
      setProducciones(data || []);
      if (!data || data.length === 0) {
        Alert.alert('Advertencia', 'No hay producciones de celofán registradas.');
      }
    } catch (error) {
      console.error('Error en fetchProducciones:', error.message, error);
      Alert.alert('Error', `Error al cargar producciones: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre')
        .eq('material', 'Celofan')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Supabase error details (fetchProductos):', error);
        throw new Error(`Error al consultar productos: ${error.message}`);
      }
      setProductos(data || []);
      if (!data || data.length === 0) {
        Alert.alert('Advertencia', 'No hay productos de celofán registrados.');
      }
    } catch (error) {
      console.error('Error en fetchProductos:', error.message, error);
      Alert.alert('Error', `Error al cargar productos: ${error.message}`);
    }
  };

  const produccionesFiltradas = producciones.filter(
    (p) =>
      p.productos?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.fecha?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const resetForm = () => {
    setForm({
      id: null,
      fecha: new Date().toISOString().split('T')[0],
      turno: '',
      maquina: '',
      producto_id: '',
      millares: '0',
      operador: '',
    });
    setMostrarFormulario(false);
  };

  const handleGuardar = async () => {
    const { fecha, turno, maquina, producto_id, millares, operador, id } = form;

    if (!fecha || !turno || !maquina.trim() || !producto_id || !operador.trim()) {
      return Alert.alert('Campos requeridos', 'Fecha, turno, máquina, producto y operador son obligatorios.');
    }

    const millaresNum = Number(millares);
    if (isNaN(millaresNum) || millaresNum <= 0) {
      return Alert.alert('Error', 'Los millares deben ser un número mayor a 0.');
    }

    try {
      setCargando(true);
      const dataEnviar = {
        fecha,
        turno,
        maquina: maquina.trim(),
        producto_id,
        millares: millaresNum,
        operador: operador.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error } = id
        ? await supabase.from('produccion_celofan').update(dataEnviar).eq('id', id)
        : await supabase.from('produccion_celofan').insert([dataEnviar]);

      if (error) {
        console.error('Supabase error details (handleGuardar):', error);
        throw new Error(`Error al guardar producción: ${error.message}`);
      }

      Alert.alert('Éxito', id ? 'Producción actualizada correctamente' : 'Producción creada correctamente');
      resetForm();
      fetchProducciones();
    } catch (error) {
      console.error('Error en handleGuardar:', error.message, error);
      Alert.alert('Error', `Error al guardar la producción: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar esta producción? Esto puede afectar movimientos de almacén asociados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              const { error } = await supabase.from('produccion_celofan').delete().eq('id', id);

              if (error) {
                console.error('Supabase error details (handleEliminar):', error);
                throw new Error(`Error al eliminar producción: ${error.message}`);
              }

              Alert.alert('Éxito', 'Producción eliminada correctamente');
              fetchProducciones();
            } catch (error) {
              console.error('Error en handleEliminar:', error.message, error);
              Alert.alert('Error', `Error al eliminar la producción: ${error.message}`);
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

      if (produccionesFiltradas.length === 0) {
        Alert.alert('Sin datos', 'No hay producciones de celofán para exportar.');
        return;
      }

      const datos = produccionesFiltradas.map((p) => ({
        Fecha: p.fecha,
        Turno: p.turno,
        Máquina: p.maquina,
        Producto: p.productos?.nombre || 'N/A',
        Millares: p.millares,
        Operador: p.operador,
      }));
      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ProduccionCelofan');

      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + 'produccion_celofan.xlsx';

      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error exportando Excel:', error.message, error);
      Alert.alert('Error', `No se pudo exportar el archivo Excel: ${error.message}`);
    } finally {
      setCargandoExportar(false);
    }
  };

  const exportarPDF = async () => {
    try {
      setCargandoExportar(true);

      if (produccionesFiltradas.length === 0) {
        Alert.alert('Sin datos', 'No hay producciones de celofán para exportar.');
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
            <h1>Producción de Celofán</h1>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Turno</th>
                  <th>Máquina</th>
                  <th>Producto</th>
                  <th>Millares</th>
                  <th>Operador</th>
                </tr>
              </thead>
              <tbody>
      `;

      produccionesFiltradas.forEach((p) => {
        html += `
          <tr>
            <td>${p.fecha || '-'}</td>
            <td>${p.turno || '-'}</td>
            <td>${p.maquina || '-'}</td>
            <td>${p.productos?.nombre || 'N/A'}</td>
            <td>${p.millares || '-'}</td>
            <td>${p.operador || '-'}</td>
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
            <div class="total">Total de producciones: ${produccionesFiltradas.length}</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error exportando PDF:', error.message, error);
      Alert.alert('Error', `No se pudo exportar el archivo PDF: ${error.message}`);
    } finally {
      setCargandoExportar(false);
    }
  };

  const editarProduccion = (produccion) => {
    setForm({
      id: produccion.id,
      fecha: produccion.fecha,
      turno: produccion.turno,
      maquina: produccion.maquina,
      producto_id: produccion.producto_id.toString(),
      millares: produccion.millares.toString(),
      operador: produccion.operador,
    });
    setMostrarFormulario(true);
  };

  const inputTheme = {
    colors: { primary: '#3b82f6', text: '#ffffff', placeholder: '#ccc' },
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <Text style={styles.title}>🏭 Producción de Celofán</Text>

      <View style={styles.buscador}>
        <Ionicons name="search" size={20} color="#ffffff" />
        <TextInput
          placeholder="Buscar por fecha o producto"
          placeholderTextColor="#ffffff"
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
          <Text style={styles.botonTexto}>➕ Agregar Producción</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={exportarExcel}
          style={styles.btnExportarExcel}
          disabled={cargandoExportar}
        >
          {cargandoExportar ? (
            <ActivityIndicator color="#ffffff" size="small" />
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
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.botonTexto}>📄 PDF</Text>
          )}
        </TouchableOpacity>
      </View>

      {mostrarFormulario && (
        <View style={styles.formulario}>
          <Text style={styles.formTitulo}>{form.id ? 'Editar Producción' : 'Nueva Producción'}</Text>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="Fecha *"
                value={form.fecha}
                onChangeText={(text) => handleChange('fecha', text)}
                mode="outlined"
                style={styles.input}
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Turno *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.turno}
                  onValueChange={(value) => handleChange('turno', value)}
                  style={styles.picker}
                  enabled={!cargando}
                  mode="dropdown"
                  dropdownIconColor="#ffffff"
                >
                  <Picker.Item
                    label="Seleccionar turno"
                    value=""
                    style={styles.pickerItemPlaceholder}
                  />
                  {turnos.map((t) => (
                    <Picker.Item
                      key={t}
                      label={t}
                      value={t}
                      style={styles.pickerItem}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="Máquina *"
                value={form.maquina}
                onChangeText={(text) => handleChange('maquina', text)}
                mode="outlined"
                style={styles.input}
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
              />
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Producto *</Text>
<View style={styles.pickerContainer}>
  <Picker
    selectedValue={form.producto_id}
    onValueChange={(value) => handleChange('producto_id', value)}
    style={styles.picker}
    enabled={!cargando}
    mode="dropdown"
    dropdownIconColor="#ffffff"
  >
    <Picker.Item
      label="Seleccionar producto"
      value=""
      style={styles.pickerItemPlaceholder}
    />
    {productos.length > 0 ? (
      productos.map((p) => (
        <Picker.Item
          key={p.id}
          label={p.nombre}
          value={p.id.toString()}
          style={styles.pickerItem}
        />
      ))
    ) : cargando ? (
      <Picker.Item
        label="Cargando productos..."
        value=""
        style={styles.pickerItemPlaceholder}
      />
    ) : (
      <Picker.Item
        label="No hay productos disponibles"
        value=""
        style={styles.pickerItemPlaceholder}
      />
    )}
  </Picker>
</View>
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="Millares *"
                value={form.millares === '0' ? '' : form.millares}
                onChangeText={(text) => handleChange('millares', text)}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
              />
            </View>
            <View style={styles.col2}>
              <PaperInput
                label="Operador *"
                value={form.operador}
                onChangeText={(text) => handleChange('operador', text)}
                mode="outlined"
                style={styles.input}
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
              />
            </View>
          </View>

          <View style={styles.botonesForm}>
            <TouchableOpacity
              style={styles.btnGuardar}
              onPress={handleGuardar}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#ffffff" size="small" />
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
        {produccionesFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {busqueda ? 'No se encontraron producciones con esa búsqueda' : 'No hay producciones de celofán registradas'}
            </Text>
          </View>
        ) : (
          produccionesFiltradas.map((p) => (
            <View key={p.id} style={styles.card}>
              <Text style={styles.nombre}>{p.productos?.nombre || 'Producto no disponible'}</Text>
              <Text style={styles.info}>📅 Fecha: {p.fecha || '-'}</Text>
              <Text style={styles.info}>⏰ Turno: {p.turno || '-'}</Text>
              <Text style={styles.info}>🏭 Máquina: {p.maquina || '-'}</Text>
              <Text style={styles.info}>📦 Millares: {p.millares || '-'}</Text>
              <Text style={styles.info}>👷 Operador: {p.operador || '-'}</Text>
              <View style={styles.botonesCard}>
                <TouchableOpacity
                  onPress={() => editarProduccion(p)}
                  style={styles.btnEditar}
                  disabled={cargando}
                >
                  <Text style={styles.botonTexto}>✏️ EDITAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleEliminar(p.id)}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 10 },
  title: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  buscador: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  inputText: { color: '#ffffff', flex: 1, paddingVertical: 10, marginLeft: 6 },
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
  botonTexto: { color: '#ffffff', fontWeight: 'bold' },
  formulario: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  formTitulo: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
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
  nombre: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
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
  row2: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  col2: {
    flex: 1,
    minWidth: '45%',
  },
  pickerContainer: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  picker: {
    color: '#ffffff',
    height: 40,
    backgroundColor: '#1e293b',
  },
  pickerItem: {
    color: '#ffffff',
    backgroundColor: '#1e293b',
    fontSize: 16,
  },
  pickerItemPlaceholder: {
    color: '#cccccc',
    backgroundColor: '#1e293b',
    fontSize: 16,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#ffffff',
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