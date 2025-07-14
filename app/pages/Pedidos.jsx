// app/pages/Pedidos.jsx
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
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

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [notasVenta, setNotasVenta] = useState([]);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoExportar, setCargandoExportar] = useState(false);
  const [form, setForm] = useState({
    id: null,
    notas_venta_id: '',
    productos_id: '',
    cantidad: '0',
    precio_unitario_sin_iva: '0',
    precio_unitario_con_iva: '0',
    subtotal: '0',
  });

  useEffect(() => {
    fetchPedidos();
    fetchNotasVenta();
    fetchProductos();
  }, []);

  const fetchPedidos = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('pedidos')
        .select('*, notas_venta(folio), productos(nombre)')
        .order('id', { ascending: false });

      if (error) {
        Alert.alert('Error', 'No se pudieron cargar los pedidos');
        console.error('Error fetching pedidos:', error);
        return;
      }

      setPedidos(data || []);
    } catch (error) {
      console.error('Error en fetchPedidos:', error);
      Alert.alert('Error', 'Error inesperado al cargar pedidos');
    } finally {
      setCargando(false);
    }
  };

  const fetchNotasVenta = async () => {
    try {
      const { data, error } = await supabase
        .from('notas_venta')
        .select('id, folio')
        .order('folio', { ascending: true });

      if (error) {
        console.error('Error fetching notas_venta:', error);
        return;
      }

      setNotasVenta(data || []);
    } catch (error) {
      console.error('Error en fetchNotasVenta:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error fetching productos:', error);
        return;
      }

      setProductos(data || []);
    } catch (error) {
      console.error('Error en fetchProductos:', error);
    }
  };

  const pedidosFiltrados = pedidos.filter(
    (p) =>
      p.productos.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.notas_venta.folio.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const calculateSubtotal = () => {
    const cantidad = Number(form.cantidad);
    const precioConIva = Number(form.precio_unitario_con_iva);
    if (!isNaN(cantidad) && !isNaN(precioConIva)) {
      setForm((prev) => ({ ...prev, subtotal: (cantidad * precioConIva).toString() }));
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      notas_venta_id: '',
      productos_id: '',
      cantidad: '0',
      precio_unitario_sin_iva: '0',
      precio_unitario_con_iva: '0',
      subtotal: '0',
    });
    setMostrarFormulario(false);
  };

  const handleGuardar = async () => {
    const { notas_venta_id, productos_id, cantidad, precio_unitario_sin_iva, precio_unitario_con_iva, subtotal, id } = form;

    if (!notas_venta_id || !productos_id || !cantidad) {
      return Alert.alert('Campos requeridos', 'Nota de venta, producto y cantidad son obligatorios.');
    }

    const cantidadNum = Number(cantidad);
    const precioSinIvaNum = Number(precio_unitario_sin_iva);
    const precioConIvaNum = Number(precio_unitario_con_iva);
    const subtotalNum = Number(subtotal);

    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      return Alert.alert('Error', 'La cantidad debe ser un número mayor a 0.');
    }
    if (isNaN(precioSinIvaNum) || precioSinIvaNum < 0) {
      return Alert.alert('Error', 'El precio sin IVA debe ser un número válido.');
    }
    if (isNaN(precioConIvaNum) || precioConIvaNum < 0) {
      return Alert.alert('Error', 'El precio con IVA debe ser un número válido.');
    }
    if (isNaN(subtotalNum) || subtotalNum <= 0) {
      return Alert.alert('Error', 'El subtotal debe ser un número mayor a 0.');
    }

    try {
      setCargando(true);
      const dataEnviar = {
        notas_venta_id,
        productos_id,
        cantidad: cantidadNum,
        precio_unitario_sin_iva: precioSinIvaNum,
        precio_unitario_con_iva: precioConIvaNum,
        subtotal: subtotalNum,
      };

      const { error } = id
        ? await supabase.from('pedidos').update(dataEnviar).eq('id', id)
        : await supabase.from('pedidos').insert([dataEnviar]);

      if (error) {
        Alert.alert('Error', 'No se pudo guardar el pedido.');
        console.error('Error saving pedido:', error);
        return;
      }

      Alert.alert('Éxito', id ? 'Pedido actualizado correctamente' : 'Pedido creado correctamente');
      resetForm();
      fetchPedidos();
    } catch (error) {
      console.error('Error en handleGuardar:', error);
      Alert.alert('Error', 'Error inesperado al guardar el pedido.');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este pedido? Esto puede afectar entregas asociadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              const { error } = await supabase.from('pedidos').delete().eq('id', id);

              if (error) {
                Alert.alert('Error', 'No se pudo eliminar el pedido.');
                console.error('Error deleting pedido:', error);
                return;
              }

              Alert.alert('Éxito', 'Pedido eliminado correctamente');
              fetchPedidos();
            } catch (error) {
              console.error('Error en handleEliminar:', error);
              Alert.alert('Error', 'Error inesperado al eliminar el pedido.');
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

      if (pedidosFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay pedidos para exportar.');
        return;
      }

      const datos = pedidosFiltrados.map((p) => ({
        Folio: p.notas_venta.folio,
        Producto: p.productos.nombre,
        Cantidad: p.cantidad,
        'Precio Unitario (sin IVA)': p.precio_unitario_sin_iva,
        'Precio Unitario (con IVA)': p.precio_unitario_con_iva,
        Subtotal: p.subtotal,
      }));
      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + 'pedidos.xlsx';

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

      if (pedidosFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay pedidos para exportar.');
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
            <h1>Lista de Pedidos</h1>
            <table>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio Unitario (sin IVA)</th>
                  <th>Precio Unitario (con IVA)</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
      `;

      pedidosFiltrados.forEach((p) => {
        html += `
          <tr>
            <td>${p.notas_venta.folio}</td>
            <td>${p.productos.nombre}</td>
            <td>${p.cantidad}</td>
            <td>${p.precio_unitario_sin_iva}</td>
            <td>${p.precio_unitario_con_iva}</td>
            <td>${p.subtotal}</td>
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
            <div class="total">Total de pedidos: ${pedidosFiltrados.length}</div>
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

  const editarPedido = (pedido) => {
    setForm({
      id: pedido.id,
      notas_venta_id: pedido.notas_venta_id,
      productos_id: pedido.productos_id,
      cantidad: pedido.cantidad.toString(),
      precio_unitario_sin_iva: pedido.precio_unitario_sin_iva.toString(),
      precio_unitario_con_iva: pedido.precio_unitario_con_iva.toString(),
      subtotal: pedido.subtotal.toString(),
    });
    setMostrarFormulario(true);
  };

  const inputTheme = {
    colors: { primary: '#3b82f6', text: '#fff', placeholder: '#ccc' },
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 Lista de Pedidos</Text>

      <View style={styles.buscador}>
        <Ionicons name="search" size={20} color="#ccc" />
        <TextInput
          placeholder="Buscar por folio o producto"
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
          <Text style={styles.botonTexto}>➕ Agregar Pedido</Text>
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
          <Text style={styles.formTitulo}>{form.id ? 'Editar Pedido' : 'Nuevo Pedido'}</Text>

          <View style={styles.row2}>
            <View style={styles.col2}>
  <Text style={styles.label}>Nota de Venta *</Text>
  <View style={styles.pickerWrapper}>
    {form.notas_venta_id !== '' && (
      <Text style={styles.valorSeleccionado}>
      {notasVenta.find((nv) => nv.id === form.notas_venta_id)?.folio}
      </Text>
    )}
    <Picker
      selectedValue={form.notas_venta_id}
      onValueChange={(value) => handleChange('notas_venta_id', value)}
      style={styles.picker}
      dropdownIconColor="#fff"
    >
      <Picker.Item label="Seleccionar nota de venta" value="" color="#ffffffff" />
      {notasVenta.map((nv) => (
        <Picker.Item key={nv.id} label={nv.folio} value={nv.id} color="#ffffffff" />
      ))}
    </Picker>
  </View>
</View>

            <View style={styles.col2}>
              <Text style={styles.label}>Producto *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.productos_id}
                  onValueChange={(value) => handleChange('productos_id', value)}
                  style={styles.picker}
                  enabled={!cargando}
                >
                  <Picker.Item label="Seleccionar producto" value="" />
                  {productos.map((p) => (
                    <Picker.Item key={p.id} label={p.nombre} value={p.id} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="Cantidad *"
                value={form.cantidad === '0' ? '' : form.cantidad}
                onChangeText={(text) => {
                  handleChange('cantidad', text);
                  calculateSubtotal();
                }}
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
                label="Precio Unitario (sin IVA)"
                value={form.precio_unitario_sin_iva === '0' ? '' : form.precio_unitario_sin_iva}
                onChangeText={(text) => handleChange('precio_unitario_sin_iva', text)}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="Precio Unitario (con IVA) *"
                value={form.precio_unitario_con_iva === '0' ? '' : form.precio_unitario_con_iva}
                onChangeText={(text) => {
                  handleChange('precio_unitario_con_iva', text);
                  calculateSubtotal();
                }}
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
                label="Subtotal"
                value={form.subtotal === '0' ? '' : form.subtotal}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={inputTheme}
                textColor="#ffffff"
                disabled
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
        {pedidosFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {busqueda ? 'No se encontraron pedidos con esa búsqueda' : 'No hay pedidos registrados'}
            </Text>
          </View>
        ) : (
          pedidosFiltrados.map((p) => (
            <View key={p.id} style={styles.card}>
              <Text style={styles.nombre}>{p.productos.nombre}</Text>
              <Text style={styles.info}>📋 Folio: {p.notas_venta.folio}</Text>
              <Text style={styles.info}>📦 Cantidad: {p.cantidad}</Text>
              <Text style={styles.info}>💵 Precio sin IVA: ${p.precio_unitario_sin_iva}</Text>
              <Text style={styles.info}>💵 Precio con IVA: ${p.precio_unitario_con_iva}</Text>
              <Text style={styles.info}>💰 Subtotal: ${p.subtotal}</Text>
              <View style={styles.botonesCard}>
                <TouchableOpacity
                  onPress={() => editarPedido(p)}
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: 12,
  },
  picker: {
    color: '#fff',
     backgroundColor: '#1e293b',
    
    
  },
  label: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
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
  pickerWrapper: {
  position: 'relative',
  backgroundColor: '#ffffffff',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#3b82f6',
  marginBottom: 12,
  overflow: 'hidden',
},

valorSeleccionado: {
  position: 'absolute',
  top: 6,
  left: 12,
  color: '#fff',
  fontSize: 13,
  fontWeight: 'bold',
  zIndex: 1,
  backgroundColor: '#1e293b',
  paddingHorizontal: 4,
},

});