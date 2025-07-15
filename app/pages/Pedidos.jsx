import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [notasVenta, setNotasVenta] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoExportar, setCargandoExportar] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState({
    id: null,
    notas_venta_id: '',
    cliente_id: '',
    productos_id: '',
    cantidad: '0',
    precio_unitario_sin_iva: '0',
    precio_unitario_con_iva: '0',
    subtotal: '0',
    fecha: new Date().toISOString().split('T')[0],
    folio: '',
    vendedor_id: '',
    status: 'Pendiente',
    pago_pendiente: '0',
    abono: '0',
  });
  const [showDetails, setShowDetails] = useState({});

  useEffect(() => {
    fetchPedidos();
    fetchNotasVenta();
    fetchClientes();
    fetchProductos();
    fetchEntregas();
    fetchVendedores();
  }, []);

  const fetchPedidos = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('pedidos')
        .select('*, notas_venta(folio, fecha, cliente_id, clientes(nombre_contacto, empresa, vendedor_id), pago_pendiente), productos(*, material, precio_kilo_venta), entregas(unidades, fecha_entrega)')
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
        .select('id, folio, fecha, cliente_id, clientes(nombre_contacto, vendedor_id), pago_pendiente')
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

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre_contacto, empresa, vendedor_id')
        .order('nombre_contacto', { ascending: true });

      if (error) {
        console.error('Error fetching clientes:', error);
        return;
      }
      setClientes(data || []);
    } catch (error) {
      console.error('Error en fetchClientes:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, material, tipo, ancho_cm, largo_cm, micraje_um, precio_kilo_venta')
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

  const fetchEntregas = async () => {
    try {
      const { data, error } = await supabase
        .from('entregas')
        .select('id, pedido_id, unidades, fecha_entrega')
        .order('fecha_entrega', { ascending: true });

      if (error) {
        console.error('Error fetching entregas:', error);
        return;
      }
      setEntregas(data || []);
    } catch (error) {
      console.error('Error en fetchEntregas:', error);
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
      setVendedores(data || []);
    } catch (error) {
      console.error('Error en fetchVendedores:', error);
    }
  };

  const pedidosFiltrados = pedidos.filter(
    (p) =>
      p.productos.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.notas_venta.folio.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleChange = (campo, valor) => {
    setForm((prev) => {
      const updatedForm = { ...prev, [campo]: valor };
      if (campo === 'cantidad' || campo === 'productos_id' || campo === 'abono') {
        calculateSubtotal(updatedForm);
      }
      return updatedForm;
    });
  };

  const calculateSubtotal = (formData = form) => {
    const cantidad = Number(formData.cantidad) || 0;
    const producto = productos.find((p) => p.id === Number(formData.productos_id));
    if (!producto || cantidad <= 0) return;

    const precioKilo = producto.precio_kilo_venta || 0;
    const largo = producto.largo_cm || 0;
    const ancho = producto.ancho_cm || 0;
    const micraje = producto.micraje_um || 0;
    let area = 0;

    if (producto.tipo === 'MORDAZA') {
      area = ((largo * (ancho + 2)) * 2 * micraje) / 10000;
    } else if (producto.tipo === 'LATERAL') {
      area = ((largo * ancho) * 2 * micraje) / 10000;
    } else if (producto.tipo === 'PEGOL') {
      area = ((largo * (ancho + 3)) * 2 * micraje) / 10000;
    } else if (producto.tipo === 'CENEFA + PEGOL') {
      area = ((largo * (ancho + 6)) * 2 * micraje) / 10000;
    } else {
      area = (largo * ancho * micraje) / 10000;
    }

    const precioBase = area * precioKilo;
    const precioConIva = precioBase * 1.16;
    const subtotal = cantidad * precioConIva;
    const pagoPendiente = subtotal - Number(formData.abono || 0);

    setForm((prev) => ({
      ...prev,
      precio_unitario_sin_iva: precioBase.toString(),
      precio_unitario_con_iva: precioConIva.toString(),
      subtotal: subtotal.toString(),
      pago_pendiente: pagoPendiente.toString(),
    }));
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
      notas_venta_id: '',
      cliente_id: '',
      productos_id: '',
      cantidad: '0',
      precio_unitario_sin_iva: '0',
      precio_unitario_con_iva: '0',
      subtotal: '0',
      fecha: new Date().toISOString().split('T')[0],
      folio: '',
      vendedor_id: '',
      status: 'Pendiente',
      pago_pendiente: '0',
      abono: '0',
    });
    setMostrarFormulario(false);
  };

  const handleGuardar = async () => {
    const { notas_venta_id, cliente_id, productos_id, cantidad, precio_unitario_sin_iva, precio_unitario_con_iva, subtotal, fecha, folio, vendedor_id, status, id, abono, pago_pendiente } = form;

    if (!notas_venta_id || !cliente_id || !productos_id || !cantidad || !fecha || !folio || !vendedor_id) {
      return Alert.alert('Campos requeridos', 'Todos los campos son obligatorios.');
    }

    const cantidadNum = Number(cantidad);
    const precioSinIvaNum = Number(precio_unitario_sin_iva);
    const precioConIvaNum = Number(precio_unitario_con_iva);
    const subtotalNum = Number(subtotal);
    const abonoNum = Number(abono);
    const pagoPendienteNum = Number(pago_pendiente);

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
    if (isNaN(abonoNum) || abonoNum < 0) {
      return Alert.alert('Error', 'El abono debe ser un número válido.');
    }
    if (isNaN(pagoPendienteNum) || pagoPendienteNum < 0) {
      return Alert.alert('Error', 'El pago pendiente debe ser un número válido.');
    }

    try {
      setCargando(true);
      const notaVentaData = {
        folio,
        fecha,
        cliente_id,
        subtotal: subtotalNum,
        iva: (subtotalNum - (subtotalNum / 1.16)).toFixed(2),
        total: subtotalNum,
        pago_pendiente: pagoPendienteNum,
      };
      let notaVentaId;
      if (!id) {
        const { data: notaData, error: notaError } = await supabase
          .from('notas_venta')
          .insert([notaVentaData])
          .select('id');
        if (notaError) throw notaError;
        notaVentaId = notaData[0].id;
      } else {
        notaVentaId = notas_venta_id;
        await supabase.from('notas_venta').update(notaVentaData).eq('id', notaVentaId);
      }

      const cliente = clientes.find((c) => c.id === Number(cliente_id));
      if (cliente && cliente.vendedor_id !== Number(vendedor_id)) {
        await supabase.from('clientes').update({ vendedor_id }).eq('id', cliente_id);
      }

      const dataEnviar = {
        notas_venta_id: notaVentaId,
        productos_id,
        cantidad: cantidadNum,
        precio_venta: precioSinIvaNum,
        precio_iva: precioConIvaNum,
      };

      const { error } = id
        ? await supabase.from('pedidos').update(dataEnviar).eq('id', id)
        : await supabase.from('pedidos').insert([dataEnviar]);

      if (error) {
        throw error; // Lanzar error para capturarlo y mostrarlo
      }

      const entregaData = { pedido_id: id || null, cantidad: cantidadNum, unidades: 'millares', fecha_entrega: status === 'Entregado' ? new Date().toISOString().split('T')[0] : null };
      if (!id) {
        await supabase.from('entregas').insert([entregaData]);
      } else {
        await supabase.from('entregas').update(entregaData).eq('pedido_id', id);
      }

      Alert.alert('Éxito', id ? 'Pedido actualizado correctamente' : 'Pedido creado correctamente');
      resetForm();
      fetchPedidos();
    } catch (error) {
      console.error('Error en handleGuardar:', error.message);
      Alert.alert('Error', `No se pudo ${id ? 'actualizar' : 'crear'} el pedido: ${error.message}`);
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
              const { error: pedidoError } = await supabase.from('pedidos').delete().eq('id', id);
              const { error: entregaError } = await supabase.from('entregas').delete().eq('pedido_id', id);

              if (pedidoError || entregaError) {
                throw pedidoError || entregaError;
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

  const handleEntregar = async (id) => {
    const pedido = pedidos.find((p) => p.id === id);
    const entregaData = { pedido_id: id, unidades: pedido.cantidad, fecha_entrega: new Date().toISOString().split('T')[0] };

    try {
      setCargando(true);
      const { error } = await supabase
        .from('entregas')
        .upsert(entregaData, { onConflict: 'pedido_id' });

      if (error) throw error;

      Alert.alert('Éxito', 'Pedido marcado como entregado');
      fetchPedidos();
    } catch (error) {
      console.error('Error en handleEntregar:', error);
      Alert.alert('Error', 'Error al marcar como entregado.');
    } finally {
      setCargando(false);
    }
  };

  const handleAbonar = async (id) => {
    const abonoNum = Number(form.abono);
    const pedido = pedidos.find((p) => p.id === id);
    const nuevoPagoPendiente = pedido.notas_venta.pago_pendiente - abonoNum;

    if (isNaN(abonoNum) || abonoNum <= 0) {
      return Alert.alert('Error', 'El abono debe ser un número mayor a 0.');
    }
    if (abonoNum > pedido.notas_venta.pago_pendiente) {
      return Alert.alert('Error', 'El abono no puede exceder el pago pendiente.');
    }

    try {
      setCargando(true);
      const { error } = await supabase
        .from('notas_venta')
        .update({ pago_pendiente: nuevoPagoPendiente })
        .eq('id', pedido.notas_venta_id);

      if (error) throw error;

      Alert.alert('Éxito', 'Abono registrado correctamente');
      resetForm();
      fetchPedidos();
    } catch (error) {
      console.error('Error en handleAbonar:', error);
      Alert.alert('Error', 'Error al registrar el abono.');
    } finally {
      setCargando(false);
    }
  };

  const exportarExcel = async () => {
    try {
      setCargandoExportar(true);

      if (pedidosFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay pedidos para exportar.');
        return;
      }

      const datos = pedidosFiltrados.map((p) => {
        const vendedor = vendedores.find((v) => v.id === p.notas_venta.clientes.vendedor_id);
        const pagado = p.notas_venta.pago_pendiente <= 0;
        return {
          Folio: p.notas_venta.folio,
          Fecha: p.notas_venta.fecha,
          Cliente: `${p.notas_venta.clientes.nombre_contacto} (${p.notas_venta.clientes.empresa || 'N/A'})`,
          Vendedor: vendedor ? vendedor.nombre : 'Sin asignar',
          Material: p.productos.material || 'N/A',
          Cantidad: p.cantidad,
          'Precio Unitario (sin IVA)': p.precio_venta,
          'Precio Unitario (con IVA)': p.precio_iva,
          Subtotal: (p.cantidad * p.precio_iva).toLocaleString('es-CO'),
          'Pago Pendiente': p.notas_venta.pago_pendiente.toLocaleString('es-CO'),
          Estatus: p.entregas?.fecha_entrega ? 'Entregado' : 'Pendiente',
          Pagado: pagado ? 'Sí' : 'No',
        };
      });
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
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Material</th>
                  <th>Cantidad</th>
                  <th>Precio Unitario (sin IVA)</th>
                  <th>Precio Unitario (con IVA)</th>
                  <th>Subtotal</th>
                  <th>Pago Pendiente</th>
                  <th>Estatus</th>
                  <th>Pagado</th>
                </tr>
              </thead>
              <tbody>
      `;

      pedidosFiltrados.forEach((p) => {
        const vendedor = vendedores.find((v) => v.id === p.notas_venta.clientes.vendedor_id);
        const pagado = p.notas_venta.pago_pendiente <= 0;
        html += `
          <tr>
            <td>${p.notas_venta.folio}</td>
            <td>${p.notas_venta.fecha}</td>
            <td>${p.notas_venta.clientes.nombre_contacto} (${p.notas_venta.clientes.empresa || 'N/A'})</td>
            <td>${vendedor ? vendedor.nombre : 'Sin asignar'}</td>
            <td>${p.productos.material || 'N/A'}</td>
            <td>${p.cantidad}</td>
            <td>${p.precio_venta}</td>
            <td>${p.precio_iva}</td>
            <td>${(p.cantidad * p.precio_iva).toFixed(2)}</td>
            <td>${p.notas_venta.pago_pendiente.toLocaleString('es-CO')}</td>
            <td>${p.entregas?.fecha_entrega ? 'Entregado' : 'Pendiente'}</td>
            <td>${pagado ? 'Sí' : 'No'}</td>
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
      cliente_id: pedido.notas_venta.cliente_id,
      productos_id: pedido.productos_id,
      cantidad: pedido.cantidad.toString(),
      precio_unitario_sin_iva: pedido.precio_venta.toString(),
      precio_unitario_con_iva: pedido.precio_iva.toString(),
      subtotal: (pedido.cantidad * pedido.precio_iva).toString(),
      fecha: pedido.notas_venta.fecha,
      folio: pedido.notas_venta.folio,
      vendedor_id: pedido.notas_venta.clientes.vendedor_id?.toString() || '',
      status: pedido.entregas?.fecha_entrega ? 'Entregado' : 'Pendiente',
      pago_pendiente: pedido.notas_venta.pago_pendiente.toString(),
      abono: '0',
    });
    setMostrarFormulario(true);
    calculateSubtotal(); // Recalcular al cargar datos de edición
  };

  const inputTheme = {
    colors: { primary: '#3b82f6', text: '#ffffff', placeholder: '#ccc' },
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 Pedidos</Text>

      <View style={styles.buscador}>
        <Ionicons name="search" size={20} color="#ffffff" />
        <TextInput
          placeholder="Buscar por folio o producto"
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
          <Text style={styles.botonTexto}>➕ Agregar pedido</Text>
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
          <Text style={styles.formTitulo}>{form.id ? 'Editar Pedido' : 'Nuevo Pedido'}</Text>
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
                    <option
                      key={c.id}
                      value={c.id}
                      style={styles.pickerItem}
                    >
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
              <Text style={styles.label}>Vendedor *</Text>
              {Platform.OS === 'web' ? (
                <select
                  value={form.vendedor_id}
                  onChange={(e) => handleChange('vendedor_id', e.target.value)}
                  style={styles.webSelect}
                >
                  <option value="" style={styles.pickerItemPlaceholder}>
                    Seleccionar vendedor
                  </option>
                  {vendedores.map((v) => (
                    <option
                      key={v.id}
                      value={v.id}
                      style={styles.pickerItem}
                    >
                      {v.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.vendedor_id}
                    onValueChange={(value) => handleChange('vendedor_id', value)}
                    style={styles.picker}
                    enabled={!cargando}
                    mode="dropdown"
                    dropdownIconColor="#ffffff"
                  >
                    <Picker.Item
                      label="Seleccionar vendedor"
                      value=""
                      style={styles.pickerItemPlaceholder}
                    />
                    {vendedores.map((v) => (
                      <Picker.Item
                        key={v.id}
                        label={v.nombre}
                        value={v.id}
                        style={styles.pickerItem}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>
          </View>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Producto *</Text>
              {Platform.OS === 'web' ? (
                <select
                  value={form.productos_id}
                  onChange={(e) => {
                    handleChange('productos_id', e.target.value);
                  }}
                  style={styles.webSelect}
                >
                  <option value="" style={styles.pickerItemPlaceholder}>
                    Seleccionar producto
                  </option>
                  {productos.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      style={styles.pickerItem}
                    >
                      {p.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.productos_id}
                    onValueChange={(value) => handleChange('productos_id', value)}
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
                    {productos.map((p) => (
                      <Picker.Item
                        key={p.id}
                        label={p.nombre}
                        value={p.id}
                        style={styles.pickerItem}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>
            <View style={styles.col2}>
              <PaperInput
                label="Cantidad *"
                value={form.cantidad}
                onChangeText={(text) => handleChange('cantidad', text)}
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
                label="Precio Unitario (sin IVA)"
                value={form.precio_unitario_sin_iva}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={inputTheme}
                textColor="#ffffff"
                disabled
                placeholder="0"
              />
            </View>
            <View style={styles.col2}>
              <PaperInput
                label="Precio Unitario (con IVA)"
                value={form.precio_unitario_con_iva}
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
                label="Subtotal"
                value={form.subtotal}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                theme={inputTheme}
                textColor="#ffffff"
                disabled
                placeholder="0"
              />
            </View>
            <View style={styles.col2}>
              <PaperInput
                label="Abono"
                value={form.abono}
                onChangeText={(text) => handleChange('abono', text)}
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
            <View style={styles.col2}>
              <Text style={styles.label}>Estatus *</Text>
              {Platform.OS === 'web' ? (
                <select
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  style={styles.webSelect}
                >
                  <option value="" style={styles.pickerItemPlaceholder}>
                    Seleccionar estatus
                  </option>
                  <option value="Pendiente" style={styles.pickerItem}>
                    Pendiente
                  </option>
                  <option value="Entregado" style={styles.pickerItem}>
                    Entregado
                  </option>
                </select>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.status}
                    onValueChange={(value) => handleChange('status', value)}
                    style={styles.picker}
                    enabled={!cargando}
                    mode="dropdown"
                    dropdownIconColor="#ffffff"
                  >
                    <Picker.Item
                      label="Seleccionar estatus"
                      value=""
                      style={styles.pickerItemPlaceholder}
                    />
                    <Picker.Item
                      label="Pendiente"
                      value="Pendiente"
                      style={styles.pickerItem}
                    />
                    <Picker.Item
                      label="Entregado"
                      value="Entregado"
                      style={styles.pickerItem}
                    />
                  </Picker>
                </View>
              )}
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
        {pedidosFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {busqueda ? 'No se encontraron pedidos con esa búsqueda' : 'No hay pedidos registrados'}
            </Text>
          </View>
        ) : (
          pedidosFiltrados.map((p) => {
            const vendedor = vendedores.find((v) => v.id === p.notas_venta.clientes.vendedor_id);
            const pagado = p.notas_venta.pago_pendiente <= 0;
            const detallesVisibles = showDetails[p.id] || false;

            return (
              <View key={p.id} style={styles.card}>
                <Text style={styles.info}>Folio: {p.notas_venta.folio || 'N/A'}</Text>
                <Text style={styles.info}>Cliente: {p.notas_venta.clientes.nombre_contacto}</Text>
                <Text style={styles.info}>Material: {p.productos.material || 'N/A'}</Text>
                <View style={styles.botonesCard}>
                  <TouchableOpacity
                    onPress={() => setShowDetails({ ...showDetails, [p.id]: !detallesVisibles })}
                    style={styles.btnVerDetalles}
                  >
                    <Text style={styles.botonTexto}>Ver detalles</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleEliminar(p.id)}
                    style={styles.btnEliminar}
                    disabled={cargando}
                  >
                    <Text style={styles.botonTexto}>Eliminar</Text>
                  </TouchableOpacity>
                  {!pagado && (
                    <TouchableOpacity
                      onPress={() => handleAbonar(p.id)}
                      style={styles.btnAbonar}
                      disabled={cargando}
                    >
                      <Text style={styles.botonTexto}>$Abonar</Text>
                    </TouchableOpacity>
                  )}
                  {!p.entregas?.fecha_entrega && (
                    <TouchableOpacity
                      onPress={() => handleEntregar(p.id)}
                      style={styles.btnEntregar}
                      disabled={cargando}
                    >
                      <Text style={styles.botonTexto}>Entregar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => editarPedido(p)}
                    style={styles.btnEditar}
                    disabled={cargando}
                  >
                    <Text style={styles.botonTexto}>Editar</Text>
                  </TouchableOpacity>
                </View>
                {detallesVisibles && (
                  <View style={styles.detalles}>
                    <Text style={styles.info}>📅 Fecha: {p.notas_venta.fecha || 'N/A'}</Text>
                    <Text style={styles.info}>📦 Producto: {p.productos.nombre}</Text>
                    <Text style={styles.info}>💵 Cantidad: {p.cantidad}</Text>
                    <Text style={styles.info}>💰 Subtotal: ${(p.cantidad * p.precio_iva).toLocaleString('es-CO')}</Text>
                    <Text style={styles.info}>👤 Vendedor: {vendedor ? vendedor.nombre : 'Sin asignar'}</Text>
                    <Text style={styles.info}>💸 Pago Pendiente: ${p.notas_venta.pago_pendiente.toLocaleString('es-CO')}</Text>
                    <Text style={styles.info}>📋 Estatus: {p.entregas?.fecha_entrega ? 'Entregado' : 'Pendiente'}</Text>
                    <Text style={styles.info}>✅ Pagado: {pagado ? 'Sí' : 'No'}</Text>
                  </View>
                )}
              </View>
            );
          })
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
  btnAbonar: {
    backgroundColor: '#0bab64',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnEntregar: {
    backgroundColor: '#3b82f6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnVerDetalles: {
    backgroundColor: '#6b7280',
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
  info: { color: '#cbd5e1', marginBottom: 5 },
  botonesCard: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 5,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  detalles: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
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