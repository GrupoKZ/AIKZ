import { Ionicons } from '@expo/vector-icons';
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
import DropDownPicker from 'react-native-dropdown-picker';
import { TextInput as PaperInput } from 'react-native-paper';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabase';

export default function Clientes() {
  const [openEstado, setOpenEstado] = useState(false);
  const [itemsEstado, setItemsEstado] = useState([
    { label: 'Activo', value: 'activo' },
    { label: 'Inactivo', value: 'inactivo' },
  ]);

  const [clientes, setClientes] = useState([]);
  const [openVendedor, setOpenVendedor] = useState(false);
  const [itemsVendedor, setItemsVendedor] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoExportar, setCargandoExportar] = useState(false);
  const [form, setForm] = useState({
    id: null,
    nombre_contacto: '',
    empresa: '',
    correo: '',
    telefono: '',
    direccion: '',
    dias_credito: '0',
    estado: 'activo',
    vendedor_id: '',
  });

  const estados = ['activo', 'inactivo'];

  useEffect(() => {
    fetchClientes();
    fetchVendedores();
  }, []);

  const fetchClientes = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*, vendedores(nombre)')
        .order('empresa', { ascending: true });

      if (error) {
        console.error('Error fetching clientes:', error);
        Alert.alert('Error', 'No se pudieron cargar los clientes');
        return;
      }

      setClientes(data || []);
    } catch (error) {
      console.error('Error en fetchClientes:', error);
      Alert.alert('Error', 'Error inesperado al cargar clientes');
    } finally {
      setCargando(false);
    }
  };

  const fetchVendedores = async () => {
    try {
      const { data, error } = await supabase
        .from('vendedores')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error fetching vendedores:', error);
        return;
      }

      const vendedorItems = data.map((vendedor) => ({
        label: vendedor.nombre || 'Sin nombre',
        value: vendedor.id,
      }));
      setItemsVendedor(vendedorItems);
      setVendedores(data || []);
    } catch (error) {
      console.error('Error en fetchVendedores:', error);
    }
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.nombre_contacto.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor || '' }));
  };

  const resetForm = () => {
    setForm({
      id: null,
      nombre_contacto: '',
      empresa: '',
      correo: '',
      telefono: '',
      direccion: '',
      dias_credito: '0',
      estado: 'activo',
      vendedor_id: '',
    });
    setMostrarFormulario(false);
  };

  const handleGuardar = async () => {
    const { nombre_contacto, empresa, correo, telefono, direccion, dias_credito, estado, vendedor_id, id } = form;

    const safeNombreContacto = nombre_contacto || '';
    const safeEmpresa = empresa || '';
    const safeCorreo = correo || '';
    const safeTelefono = telefono || '';

    if (!safeNombreContacto.trim() || !safeEmpresa.trim() || !safeCorreo.trim() || !safeTelefono.trim()) {
      return Alert.alert('Campos requeridos', 'Nombre, empresa, correo y teléfono son obligatorios.');
    }

    const diasCreditoNum = Number(dias_credito);
    if (isNaN(diasCreditoNum) || diasCreditoNum < 0) {
      return Alert.alert('Error', 'Días de crédito debe ser un número no negativo.');
    }

    try {
      setCargando(true);
      const dataEnviar = {
        nombre_contacto: safeNombreContacto.trim(),
        empresa: safeEmpresa.trim(),
        correo: safeCorreo.trim(),
        telefono: safeTelefono.trim(),
        direccion: direccion?.trim() || null,
        dias_credito: diasCreditoNum,
        estado,
        vendedor_id: vendedor_id || null,
      };

      const { error } = id
        ? await supabase.from('clientes').update(dataEnviar).eq('id', id)
        : await supabase.from('clientes').insert([dataEnviar]);

      if (error) {
        console.error('Error saving/updating client:', error);
        Alert.alert('Error', `No se pudo ${id ? 'actualizar' : 'guardar'} el cliente: ${error.message}`);
        return;
      }

      Alert.alert('Éxito', id ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente');
      resetForm();
      fetchClientes();
    } catch (error) {
      console.error('Unexpected error in handleGuardar:', error);
      Alert.alert('Error', 'Error inesperado al guardar el cliente.');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este cliente? Esto puede afectar pedidos o cuentas por cobrar asociadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              const { error } = await supabase.from('clientes').delete().eq('id', id);

              if (error) {
                console.error('Error deleting client:', error);
                Alert.alert('Error', `No se pudo eliminar el cliente: ${error.message}`);
                return;
              }

              Alert.alert('Éxito', 'Cliente eliminado correctamente');
              fetchClientes();
            } catch (error) {
              console.error('Unexpected error in handleEliminar:', error);
              Alert.alert('Error', 'Error inesperado al eliminar el cliente.');
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

      if (clientesFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay clientes para exportar.');
        return;
      }

      const datos = clientesFiltrados.map((c) => ({
        'Nombre Contacto': c.nombre_contacto || '-',
        Empresa: c.empresa || '-',
        Correo: c.correo || '-',
        Teléfono: c.telefono || '-',
        Dirección: c.direccion || '-',
        'Días Crédito': c.dias_credito || 0,
        Estado: c.estado || '-',
        Vendedor: c.vendedores?.nombre || '-',
      }));
      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + 'clientes.xlsx';

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

      if (clientesFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay clientes para exportar.');
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
            <h1>Lista de Clientes</h1>
            <table>
              <thead>
                <tr>
                  <th>Nombre Contacto</th>
                  <th>Empresa</th>
                  <th>Correo</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Días Crédito</th>
                  <th>Estado</th>
                  <th>Vendedor</th>
                </tr>
              </thead>
              <tbody>
      `;

      clientesFiltrados.forEach((c) => {
        html += `
          <tr>
            <td>${c.nombre_contacto || '-'}</td>
            <td>${c.empresa || '-'}</td>
            <td>${c.correo || '-'}</td>
            <td>${c.telefono || '-'}</td>
            <td>${c.direccion || '-'}</td>
            <td>${c.dias_credito || 0}</td>
            <td>${c.estado || '-'}</td>
            <td>${c.vendedores?.nombre || '-'}</td>
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
            <div class="total">Total de clientes: ${clientesFiltrados.length}</div>
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

  const editarCliente = (cliente) => {
    setForm({
      id: cliente.id,
      nombre_contacto: cliente.nombre_contacto || '',
      empresa: cliente.empresa || '',
      correo: cliente.correo || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      dias_credito: cliente.dias_credito?.toString() || '0',
      estado: cliente.estado || 'activo',
      vendedor_id: cliente.vendedor_id || '',
    });
    setMostrarFormulario(true);
  };

  const inputTheme = {
    colors: { primary: '#3b82f6', text: '#fff', placeholder: '#ccc' },
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <Text style={styles.title}>👥 Clientes</Text>

      <View style={styles.buscador}>
        <Ionicons name="search" size={20} color="#ccc" />
        <TextInput
          placeholder="Buscar por nombre o empresa"
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
          <Text style={styles.botonTexto}>➕ Agregar Cliente</Text>
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
          <Text style={styles.formTitulo}>{form.id ? 'Editar Cliente' : 'Nuevo Cliente'}</Text>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="Nombre Contacto *"
                value={form.nombre_contacto}
                onChangeText={(text) => handleChange('nombre_contacto', text)}
                mode="outlined"
                style={styles.input}
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
              />
            </View>
            <View style={styles.col2}>
              <PaperInput
                label="Empresa *"
                value={form.empresa}
                onChangeText={(text) => handleChange('empresa', text)}
                mode="outlined"
                style={styles.input}
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="Correo *"
                value={form.correo}
                onChangeText={(text) => handleChange('correo', text)}
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
              />
            </View>
            <View style={styles.col2}>
              <PaperInput
                label="Teléfono *"
                value={form.telefono}
                onChangeText={(text) => handleChange('telefono', text)}
                mode="outlined"
                style={styles.input}
                keyboardType="phone-pad"
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="Dirección"
                value={form.direccion}
                onChangeText={(text) => handleChange('direccion', text)}
                mode="outlined"
                style={styles.input}
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando}
              />
            </View>
            <View style={styles.col2}>
              <PaperInput
                label="Días Crédito"
                value={form.dias_credito === '0' ? '' : form.dias_credito}
                onChangeText={(text) => handleChange('dias_credito', text)}
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
              <Text style={styles.label}>Estado *</Text>
              <DropDownPicker
                open={openEstado}
                value={form.estado}
                items={itemsEstado}
                setOpen={setOpenEstado}
                setValue={(callback) =>
                  setForm((prev) => ({ ...prev, estado: callback(prev.estado) }))
                }
                setItems={setItemsEstado}
                placeholder="Seleccionar estado"
                style={{
                  backgroundColor: '#1e293b',
                  borderColor: '#3b82f6',
                  marginBottom: 12,
                }}
                dropDownContainerStyle={{
                  backgroundColor: '#1e293b',
                  borderColor: '#3b82f6',
                }}
                textStyle={{ color: '#fff' }}
                placeholderStyle={{ color: '#ccc' }}
                disabled={cargando}
              />
            </View>

            <View style={styles.col2}>
              <Text style={styles.label}>Vendedor</Text>
              <DropDownPicker
                open={openVendedor}
                value={form.vendedor_id}
                items={itemsVendedor}
                setOpen={setOpenVendedor}
                setValue={(callback) =>
                  setForm((prev) => ({ ...prev, vendedor_id: callback(prev.vendedor_id) }))
                }
                setItems={setItemsVendedor}
                placeholder="Sin vendedor"
                style={{
                  backgroundColor: '#1e293b',
                  borderColor: '#3b82f6',
                  marginBottom: 12,
                }}
                dropDownContainerStyle={{
                  backgroundColor: '#1e293b',
                  borderColor: '#3b82f6',
                }}
                textStyle={{ color: '#fff' }}
                placeholderStyle={{ color: '#ccc' }}
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
        {clientesFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {busqueda ? 'No se encontraron clientes con esa búsqueda' : 'No hay clientes registrados'}
            </Text>
          </View>
        ) : (
          clientesFiltrados.map((c) => (
            <View key={c.id} style={styles.card}>
              <Text style={styles.nombre}>{c.empresa || '-'}</Text>
              <Text style={styles.info}>👤 Contacto: {c.nombre_contacto || '-'}</Text>
              <Text style={styles.info}>📧 Correo: {c.correo || '-'}</Text>
              <Text style={styles.info}>📱 Teléfono: {c.telefono || '-'}</Text>
              <Text style={styles.info}>📍 Dirección: {c.direccion || '-'}</Text>
              <Text style={styles.info}>💳 Días Crédito: {c.dias_credito || 0}</Text>
              <Text style={styles.info}>📊 Estado: {c.estado || '-'}</Text>
              <Text style={styles.info}>👨‍💼 Vendedor: {c.vendedores?.nombre || '-'}</Text>
              <View style={styles.botonesCard}>
                <TouchableOpacity
                  onPress={() => editarCliente(c)}
                  style={styles.btnEditar}
                  disabled={cargando}
                >
                  <Text style={styles.botonTexto}>✏️ EDITAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleEliminar(c.id)}
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
});