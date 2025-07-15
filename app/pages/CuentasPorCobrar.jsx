import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert, Platform, ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { TextInput as PaperInput } from 'react-native-paper';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabase';

export default function CuentasPorCobrar() {
  const [notasVenta, setNotasVenta] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoExportar, setCargandoExportar] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState({
    id: null,
    folio: '',
    fecha: new Date().toISOString().split('T')[0],
    cliente_id: '',
    subtotal: '',
    iva: '',
    total: '',
    pago_pendiente: '',
  });

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  useEffect(() => {
    fetchNotasVenta();
    fetchClientes();
  }, []);

  const fetchNotasVenta = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('notas_venta')
        .select('*, clientes(nombre_contacto, empresa), created_at, updated_at')
        .gt('pago_pendiente', 0)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setNotasVenta(data || []);
    } catch (error) {
      console.error('Error en fetchNotasVenta:', error);
      Alert.alert('Error', 'Error al cargar cuentas por cobrar');
    } finally {
      setCargando(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre_contacto, empresa')
        .order('nombre_contacto', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error en fetchClientes:', error);
      Alert.alert('Error', 'Error al cargar clientes');
    }
  };

  const notasFiltradas = notasVenta.filter(
    (n) =>
      n.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.clientes.nombre_contacto.toLowerCase().includes(busqueda.toLowerCase()) ||
      (n.clientes.empresa || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const calculateTotal = () => {
    const subtotal = Number(form.subtotal);
    const iva = Number(form.iva) || 0;
    if (!isNaN(subtotal) && !isNaN(iva) && subtotal >= 0) {
      const total = subtotal + iva;
      setForm((prev) => ({
        ...prev,
        total: total.toString(),
        pago_pendiente: total.toString(),
      }));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      handleChange('fecha', formattedDate);
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      folio: '',
      fecha: new Date().toISOString().split('T')[0],
      cliente_id: '',
      subtotal: '',
      iva: '',
      total: '',
      pago_pendiente: '',
    });
    setMostrarFormulario(false);
  };

  const handleGuardar = async () => {
    const { folio, fecha, cliente_id, subtotal, iva, total, pago_pendiente, id } = form;

    if (!folio.trim() || !fecha || !cliente_id) {
      return Alert.alert('Campos requeridos', 'Folio, fecha y cliente son obligatorios.');
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fecha)) {
      return Alert.alert('Error', 'La fecha debe estar en formato AAAA-MM-DD.');
    }

    const subtotalNum = Number(subtotal);
    const ivaNum = Number(iva) || 0;
    const totalNum = Number(total);
    const pagoPendienteNum = Number(pago_pendiente);

    if (isNaN(subtotalNum) || subtotalNum <= 0) {
      return Alert.alert('Error', 'El subtotal debe ser un número mayor a 0.');
    }
    if (isNaN(ivaNum) || ivaNum < 0) {
      return Alert.alert('Error', 'El IVA debe ser un número válido.');
    }
    if (isNaN(totalNum) || totalNum <= 0) {
      return Alert.alert('Error', 'El total debe ser un número mayor a 0.');
    }
    if (isNaN(pagoPendienteNum) || pagoPendienteNum < 0) {
      return Alert.alert('Error', 'El pago pendiente debe ser un número válido.');
    }

    try {
      setCargando(true);
      const dataEnviar = {
        folio: folio.trim(),
        fecha,
        cliente_id,
        subtotal: subtotalNum,
        iva: ivaNum,
        total: totalNum,
        pago_pendiente: pagoPendienteNum,
        updated_at: new Date().toISOString(),
      };

      const { error } = id
        ? await supabase.from('notas_venta').update(dataEnviar).eq('id', id)
        : await supabase
            .from('notas_venta')
            .insert([dataEnviar])
            .select()
            .single();

      if (error) throw error;
      Alert.alert('Éxito', id ? 'Cuenta actualizada' : 'Cuenta creada');
      resetForm();
      fetchNotasVenta();
    } catch (error) {
      console.error('Error en handleGuardar:', error);
      Alert.alert('Error', 'Error al guardar la cuenta');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar esta cuenta por cobrar? Esto puede afectar pedidos o pagos asociados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              const { error } = await supabase.from('notas_venta').delete().eq('id', id);
              if (error) throw error;
              Alert.alert('Éxito', 'Cuenta eliminada');
              fetchNotasVenta();
            } catch (error) {
              console.error('Error en handleEliminar:', error);
              Alert.alert('Error', 'Error al eliminar la cuenta');
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
      if (!notasFiltradas.length) {
        Alert.alert('Sin datos', 'No hay cuentas por cobrar para exportar.');
        return;
      }
      const datos = notasFiltradas.map((n) => ({
        Folio: n.folio,
        Fecha: n.fecha,
        Cliente: `${n.clientes.nombre_contacto} (${n.clientes.empresa || 'N/A'})`,
        Subtotal: n.subtotal.toLocaleString('es-CO'),
        IVA: n.iva.toLocaleString('es-CO'),
        Total: n.total.toLocaleString('es-CO'),
        'Pago Pendiente': n.pago_pendiente.toLocaleString('es-CO'),
        Creado: formatTimestamp(n.created_at),
        Actualizado: formatTimestamp(n.updated_at),
      }));
      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CuentasPorCobrar');
      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + 'cuentas_por_cobrar.xlsx';
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      Alert.alert('Error', 'No se pudo exportar el archivo Excel');
    } finally {
      setCargandoExportar(false);
    }
  };

  const exportarPDF = async () => {
    try {
      setCargandoExportar(true);
      if (!notasFiltradas.length) {
        Alert.alert('Sin datos', 'No hay cuentas por cobrar para exportar.');
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
            <h1>Cuentas por Cobrar</h1>
            <table>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Subtotal</th>
                  <th>IVA</th>
                  <th>Total</th>
                  <th>Pago Pendiente</th>
                  <th>Creado</th>
                  <th>Actualizado</th>
                </tr>
              </thead>
              <tbody>
      `;
      notasFiltradas.forEach((n) => {
        html += `
          <tr>
            <td>${n.folio}</td>
            <td>${n.fecha}</td>
            <td>${n.clientes.nombre_contacto} (${n.clientes.empresa || 'N/A'})</td>
            <td>${n.subtotal.toLocaleString('es-CO')}</td>
            <td>${n.iva.toLocaleString('es-CO')}</td>
            <td>${n.total.toLocaleString('es-CO')}</td>
            <td>${n.pago_pendiente.toLocaleString('es-CO')}</td>
            <td>${formatTimestamp(n.created_at)}</td>
            <td>${formatTimestamp(n.updated_at)}</td>
          </tr>
        `;
      });
      html += `
              </tbody>
            </table>
            <div class="total">Total de cuentas: ${notasFiltradas.length}</div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error exportando PDF:', error);
      Alert.alert('Error', 'No se pudo exportar el archivo PDF');
    } finally {
      setCargandoExportar(false);
    }
  };

  const editarNota = (nota) => {
    setForm({
      id: nota.id,
      folio: nota.folio,
      fecha: nota.fecha,
      cliente_id: nota.cliente_id,
      subtotal: nota.subtotal.toString(),
      iva: nota.iva.toString(),
      total: nota.total.toString(),
      pago_pendiente: nota.pago_pendiente.toString(),
    });
    setMostrarFormulario(true);
  };

  const inputTheme = {
    colors: { primary: '#3b82f6', text: '#ffffff', placeholder: '#ccc' },
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💰 Cuentas por Cobrar</Text>

      <View style={styles.buscador}>
        <Ionicons name="search" size={20} color="#ffffff" />
        <TextInput
          placeholder="Buscar por folio o cliente"
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
          <Text style={styles.botonTexto}>➕ Agregar Cuenta</Text>
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
          <Text style={styles.formTitulo}>{form.id ? 'Editar Cuenta' : 'Nueva Cuenta'}</Text>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="Folio *"
                value={form.folio}
                onChangeText={(text) => handleChange('folio', text)}
                mode="outlined"
                style={styles.input}
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
              />
            </View>
            <View style={styles.col2}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.datePickerButton}
                disabled={cargando}
              >
                <PaperInput
                  label="Fecha *"
                  value={form.fecha}
                  mode="outlined"
                  style={styles.input}
                  theme={inputTheme}
                  textColor="#ffffff"
                  editable={false}
                  right={<PaperInput.Icon name="calendar" color="#ffffff" />}
                />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(form.fecha)}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>
          </View>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Cliente *</Text>
              {Platform.OS === 'web' ? (
                <select
                  value={form.cliente_id}
                  onChange={(e) => handleChange('cliente_id', e.target.value)}
                  style={styles.webSelect}
                >
                  <option value="" style={styles.pickerItemPlaceholder}>
                    Seleccionar cliente
                  </option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id} style={styles.pickerItem}>
                      {`${c.nombre_contacto} (${c.empresa || 'N/A'})`}
                    </option>
                  ))}
                </select>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.cliente_id}
                    onValueChange={(value) => handleChange('cliente_id', value)}
                    style={styles.picker}
                    enabled={!cargando}
                    mode="dropdown"
                    dropdownIconColor="#ffffff"
                  >
                    <Picker.Item
                      label="Seleccionar cliente"
                      value=""
                      style={styles.pickerItemPlaceholder}
                    />
                    {clientes.map((c) => (
                      <Picker.Item
                        key={c.id}
                        label={`${c.nombre_contacto} (${c.empresa || 'N/A'})`}
                        value={c.id}
                        style={styles.pickerItem}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>
            <View style={styles.col2}>
              <PaperInput
                label="Subtotal *"
                value={form.subtotal}
                onChangeText={(text) => {
                  handleChange('subtotal', text);
                  calculateTotal();
                }}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
                placeholder="0"
              />
            </View>
          </View>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="IVA"
                value={form.iva}
                onChangeText={(text) => {
                  handleChange('iva', text);
                  calculateTotal();
                }}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
                placeholder="0"
              />
            </View>
            <View style={styles.col2}>
              <PaperInput
                label="Total"
                value={form.total}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={inputTheme}
                textColor="#ffffff"
                disabled
                placeholder="0"
              />
            </View>
          </View>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="Pago Pendiente"
                value={form.pago_pendiente}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={inputTheme}
                textColor="#ffffff"
                disabled
                placeholder="0"
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
        {notasFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {busqueda
                ? 'No se encontraron cuentas con esa búsqueda'
                : 'No hay cuentas por cobrar registradas'}
            </Text>
          </View>
        ) : (
          notasFiltradas.map((n) => (
            <View key={n.id} style={styles.card}>
              <Text style={styles.nombre}>{n.folio}</Text>
              <Text style={styles.info}>
                👤 {n.clientes.nombre_contacto} ({n.clientes.empresa || 'N/A'})
              </Text>
              <Text style={styles.info}>📅 Fecha: {n.fecha}</Text>
              <Text style={styles.info}>💵 Subtotal: ${n.subtotal.toLocaleString('es-CO')}</Text>
              <Text style={styles.info}>🧾 IVA: ${n.iva.toLocaleString('es-CO')}</Text>
              <Text style={styles.info}>💰 Total: ${n.total.toLocaleString('es-CO')}</Text>
              <Text style={styles.info}>
                ⏳ Pago Pendiente: ${n.pago_pendiente.toLocaleString('es-CO')}
              </Text>
              <Text style={styles.info}>📅 Creado: {formatTimestamp(n.created_at)}</Text>
              <Text style={styles.info}>📅 Actualizado: {formatTimestamp(n.updated_at)}</Text>
              <View style={styles.botonesCard}>
                <TouchableOpacity
                  onPress={() => editarNota(n)}
                  style={styles.btnEditar}
                  disabled={cargando}
                >
                  <Text style={styles.botonTexto}>✏️ EDITAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleEliminar(n.id)}
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
  webSelect: {
    height: 40,
    width: '100%',
    color: '#ffffff',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingHorizontal: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 4,
  },
  datePickerButton: {
    marginBottom: 12,
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