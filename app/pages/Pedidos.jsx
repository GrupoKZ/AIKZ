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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { TextInput as PaperInput } from 'react-native-paper';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabase';

export default function Pedidos() {
  // Estados principales
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarDetalles, setMostrarDetalles] = useState(null);
  const [mostrarFormularioProducto, setMostrarFormularioProducto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoExportar, setCargandoExportar] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [aplicarIva, setAplicarIva] = useState(true);

  // Estados de formularios
  const [form, setForm] = useState({
    id: null,
    notas_venta_id: '',
    cliente_id: '',
    productos_id: '',
    cantidad: '',
    fecha: new Date().toISOString().split('T')[0],
    folio: '',
    vendedor_id: '',
    abono: '',
    descuento: '0',
  });

  const [detalleForm, setDetalleForm] = useState({
    productos_id: '',
    cantidad: '',
  });

  const [productosSeleccionados, setProductosSeleccionados] = useState([]);

  useEffect(() => {
    fetchDatos();
  }, []);

  const fetchDatos = async () => {
    await Promise.all([
      fetchPedidos(),
      fetchClientes(),
      fetchProductos(),
      fetchVendedores()
    ]);
  };

  const fetchPedidos = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          notas_venta!inner(
            id,
            folio,
            fecha,
            cliente_id,
            pago_pendiente,
            subtotal,
            iva,
            total,
            descuento,
            clientes!inner(
              id,
              nombre_contacto,
              empresa,
              vendedor_id
            )
          ),
          productos!inner(
            id,
            nombre,
            material,
            tipo,
            ancho_cm,
            largo_cm,
            micraje_um
          ),
          entregas(
            id,
            cantidad,
            unidades,
            fecha_entrega
          )
        `)
        .order('id', { ascending: false });

      if (error) throw error;

      const pedidosValidos = (data || []).filter(pedido => 
        pedido?.notas_venta?.clientes && pedido?.productos
      );

      setPedidos(pedidosValidos);
    } catch (error) {
      console.error('Error en fetchPedidos:', error);
      Alert.alert('Error', 'Error al cargar pedidos: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre_contacto, empresa, vendedor_id')
        .order('nombre_contacto', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error en fetchClientes:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, material, tipo, ancho_cm, largo_cm, micraje_um')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error('Error en fetchProductos:', error);
    }
  };

  const fetchVendedores = async () => {
    try {
      const { data, error } = await supabase
        .from('vendedores')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setVendedores(data || []);
    } catch (error) {
      console.error('Error en fetchVendedores:', error);
    }
  };

  // Filtros y cálculos
  const pedidosFiltrados = pedidos.filter((p) => {
    if (!p?.productos || !p?.notas_venta) return false;
    
    const searchTerms = [
      p.productos.nombre,
      p.notas_venta.folio,
      p.notas_venta.clientes.nombre_contacto
    ].join(' ').toLowerCase();
    
    return searchTerms.includes(busqueda.toLowerCase());
  });

  const calculateSubtotal = (cantidad, productos_id) => {
    const cantidadNum = Number(cantidad || '0');
    const producto = productos.find((p) => p.id === Number(productos_id || ''));
    if (!producto || cantidadNum <= 0) {
      return {
        precio_unitario_sin_iva: '0',
        precio_unitario_con_iva: '0',
        subtotal: '0',
      };
    }

    // Cálculo del precio base según material
    let precioPorKilo = 50;
    if (producto.material === 'CELOFAN') precioPorKilo = 45;
    else if (producto.material === 'POLIETILENO') precioPorKilo = 35;

    // Calcular peso según material
    let pesoKg = 0;
    if (producto.material === 'CELOFAN') {
      pesoKg = (producto.largo_cm * producto.ancho_cm * 2 * producto.micraje_um) / 10000 * cantidadNum / 1000;
    } else if (producto.material === 'POLIETILENO') {
      pesoKg = cantidadNum;
    }

    const precioBase = pesoKg * precioPorKilo;
    const precioSinIva = precioBase;
    const precioConIva = aplicarIva ? precioSinIva * 1.16 : precioSinIva;

    return {
      precio_unitario_sin_iva: precioSinIva.toFixed(2),
      precio_unitario_con_iva: precioConIva.toFixed(2),
      subtotal: precioConIva.toFixed(2),
    };
  };

  // Manejadores de eventos
  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleDetalleChange = (campo, valor) => {
    setDetalleForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      handleChange('fecha', formattedDate);
    }
  };

  // Funciones de reset
  const resetForm = () => {
    setForm({
      id: null,
      notas_venta_id: '',
      cliente_id: '',
      productos_id: '',
      cantidad: '',
      fecha: new Date().toISOString().split('T')[0],
      folio: '',
      vendedor_id: '',
      abono: '',
      descuento: '0',
    });
    setMostrarFormulario(false);
    setAplicarIva(true);
    setProductosSeleccionados([]);
    setMostrarFormularioProducto(false);
    resetDetalleForm();
  };

  const resetDetalleForm = () => {
    setDetalleForm({
      productos_id: '',
      cantidad: '',
    });
  };

  // CRUD Operations
  const handleGuardar = async () => {
    const { cliente_id, productos_id, cantidad, fecha, vendedor_id, id, abono } = form;

    if (!cliente_id || !fecha || !vendedor_id) {
      return Alert.alert('Campos requeridos', 'Cliente, fecha y vendedor son obligatorios.');
    }

    const cantidadNum = Number(cantidad) || 0;
    const abonoNum = Number(abono) || 0;

    if (cantidadNum <= 0 && productosSeleccionados.length === 0) {
      return Alert.alert('Error', 'Debe agregar al menos un producto.');
    }

    try {
      setCargando(true);
      
      // Calcular totales
      let subtotalTotal = 0;
      
      if (productosSeleccionados.length > 0) {
        subtotalTotal = productosSeleccionados.reduce((acc, p) => acc + Number(p.subtotal || 0), 0);
      }
      
      if (productos_id && cantidadNum > 0) {
        const { subtotal } = calculateSubtotal(cantidad, productos_id);
        subtotalTotal += Number(subtotal);
      }

      const ivaTotal = aplicarIva ? subtotalTotal * 0.16 : 0;
      const totalFinal = subtotalTotal + ivaTotal;

      // Crear nota de venta
      const notaVentaData = {
        folio: id || Date.now().toString(), // Use id if editing, otherwise a unique timestamp
        fecha,
        cliente_id: Number(cliente_id),
        subtotal: subtotalTotal,
        iva: ivaTotal,
        total: totalFinal,
        pago_pendiente: totalFinal - abonoNum,
        descuento: '0',
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
        notaVentaId = form.notas_venta_id;
        const { error: notaUpdateError } = await supabase
          .from('notas_venta')
          .update(notaVentaData)
          .eq('id', notaVentaId);
        
        if (notaUpdateError) throw notaUpdateError;
      }

      // Actualizar vendedor del cliente
      const cliente = clientes.find((c) => c.id === Number(cliente_id));
      if (cliente && cliente.vendedor_id !== Number(vendedor_id)) {
        await supabase
          .from('clientes')
          .update({ vendedor_id: Number(vendedor_id) })
          .eq('id', cliente_id);
      }

      // Insertar productos
      const todosProductos = [];
      
      if (productosSeleccionados.length > 0) {
        todosProductos.push(...productosSeleccionados.map((p) => ({
          notas_venta_id: notaVentaId,
          productos_id: Number(p.productos_id),
          cantidad: Number(p.cantidad),
          precio_kilo_venta: Number(p.precio_unitario_sin_iva),
          precio_venta: Number(p.precio_unitario_sin_iva),
          precio_iva: Number(p.precio_unitario_con_iva),
        })));
      }

      if (productos_id && cantidadNum > 0) {
        const { precio_unitario_sin_iva, precio_unitario_con_iva } = calculateSubtotal(cantidad, productos_id);
        
        todosProductos.push({
          notas_venta_id: notaVentaId,
          productos_id: Number(productos_id),
          cantidad: cantidadNum,
          precio_kilo_venta: Number(precio_unitario_sin_iva),
          precio_venta: Number(precio_unitario_sin_iva),
          precio_iva: Number(precio_unitario_con_iva),
        });
      }

      if (todosProductos.length > 0) {
        if (id) {
          // Actualizar pedido existente
          const { error } = await supabase
            .from('pedidos')
            .update(todosProductos[0])
            .eq('id', id);
          if (error) throw error;
        } else {
          // Insertar nuevos pedidos
          const { data: pedidoData, error } = await supabase
            .from('pedidos')
            .insert(todosProductos)
            .select('id');
          if (error) throw error;
          setForm((prev) => ({ ...prev, id: pedidoData[0].id, folio: pedidoData[0].id.toString() }));
        }
      }

      // Registrar pago inicial si hay abono
      if (abonoNum > 0) {
        await supabase
          .from('pagos')
          .insert([{
            notas_venta_id: notaVentaId,
            fecha: new Date().toISOString().split('T')[0],
            importe: abonoNum,
            cliente_id: Number(cliente_id)
          }]);
      }

      Alert.alert('Éxito', id ? 'Pedido actualizado correctamente' : 'Pedido creado correctamente');
      resetForm();
      fetchPedidos();
    } catch (error) {
      console.error('Error en handleGuardar:', error);
      Alert.alert('Error', 'Error al guardar el pedido: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este pedido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              
              await supabase.from('entregas').delete().eq('pedido_id', id);
              const { error } = await supabase.from('pedidos').delete().eq('id', id);

              if (error) throw error;

              Alert.alert('Éxito', 'Pedido eliminado correctamente');
              fetchPedidos();
            } catch (error) {
              Alert.alert('Error', 'Error al eliminar el pedido: ' + error.message);
            } finally {
              setCargando(false);
            }
          },
        },
      ]
    );
  };

  const handleEntregar = async (id) => {
    try {
      setCargando(true);
      const pedido = pedidos.find((p) => p.id === id);
      
      const entregaData = { 
        pedido_id: id, 
        cantidad: pedido.cantidad, 
        unidades: 'millares', 
        fecha_entrega: new Date().toISOString().split('T')[0] 
      };

      const { error } = await supabase
        .from('entregas')
        .upsert(entregaData, { onConflict: 'pedido_id' });

      if (error) throw error;

      Alert.alert('Éxito', 'Pedido marcado como entregado');
      fetchPedidos();
    } catch (error) {
      Alert.alert('Error', 'Error al marcar como entregado: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleAbonar = async (id) => {
  // Use window.prompt for web compatibility
  const abonoStr = window.prompt('Ingrese el monto del abono:', '');
  if (!abonoStr) return;

  const abonoNum = Number(abonoStr) || 0;
  const pedido = pedidos.find((p) => p.id === id);
  
  if (!pedido?.notas_venta) {
    return Alert.alert('Error', 'No se pudo encontrar la información del pedido.');
  }

  if (abonoNum <= 0 || abonoNum > pedido.notas_venta.pago_pendiente) {
    return Alert.alert('Error', 'El abono debe ser mayor a 0 y menor al pago pendiente.');
  }

  try {
    setCargando(true);
    const nuevoPagoPendiente = pedido.notas_venta.pago_pendiente - abonoNum;
    
    // Actualizar pago pendiente
    await supabase
      .from('notas_venta')
      .update({ pago_pendiente: nuevoPagoPendiente })
      .eq('id', pedido.notas_venta_id);

    // Registrar el pago
    await supabase
      .from('pagos')
      .insert([{
        notas_venta_id: pedido.notas_venta_id,
        fecha: new Date().toISOString().split('T')[0],
        importe: abonoNum,
        cliente_id: pedido.notas_venta.cliente_id
      }]);

    Alert.alert('Éxito', 'Abono registrado correctamente');
    fetchPedidos();
  } catch (error) {
    Alert.alert('Error', 'Error al registrar el abono: ' + error.message);
  } finally {
    setCargando(false);
  }
};

  const handleAñadirProducto = () => {
    const { productos_id, cantidad } = detalleForm;

    if (!productos_id || !cantidad || Number(cantidad) <= 0) {
      return Alert.alert('Error', 'Debe seleccionar un producto y especificar una cantidad válida.');
    }

    const precios = calculateSubtotal(cantidad, productos_id);
    const productoNombre = productos.find(p => p.id === Number(productos_id))?.nombre || 'Producto';
    const nuevoProducto = {
      productos_id,
      cantidad: Number(cantidad),
      precio_unitario_sin_iva: precios.precio_unitario_sin_iva,
      precio_unitario_con_iva: precios.precio_unitario_con_iva,
      subtotal: precios.subtotal,
      nombre: productoNombre,
    };

    setProductosSeleccionados((prev) => [...prev, nuevoProducto]);
    resetDetalleForm();
    setMostrarFormularioProducto(false);
  };

  const handleEliminarProducto = (index) => {
    setProductosSeleccionados(prev => prev.filter((_, i) => i !== index));
  };

  // Funciones de exportación
  const exportarExcel = async () => {
    try {
      setCargandoExportar(true);
      if (pedidosFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay pedidos para exportar.');
        return;
      }

      const datos = pedidosFiltrados.map((p) => {
        const vendedorPedido = vendedores.find((v) => v.id === p.notas_venta?.clientes?.vendedor_id);
        const pagado = (p.notas_venta?.pago_pendiente || 0) <= 0;
        
        return {
          Folio: p.notas_venta?.folio || 'N/A',
          Fecha: p.notas_venta?.fecha || 'N/A',
          Cliente: `${p.notas_venta?.clientes?.nombre_contacto || 'N/A'} (${p.notas_venta?.clientes?.empresa || 'N/A'})`,
          Vendedor: vendedorPedido?.nombre || 'Sin asignar',
          Material: p.productos?.material || 'N/A',
          Producto: p.productos?.nombre || 'N/A',
          Cantidad: p.cantidad || 0,
          'Precio Unitario': p.precio_venta || 0,
          'Precio con IVA': p.precio_iva || 0,
          Total: ((p.cantidad || 0) * (p.precio_iva || 0)).toFixed(2),
          'Pago Pendiente': (p.notas_venta?.pago_pendiente || 0).toFixed(2),
          Estado: p.entregas?.fecha_entrega ? 'Entregado' : 'Pendiente',
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
      Alert.alert('Error', 'No se pudo exportar el archivo Excel: ' + error.message);
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
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
      `;

      pedidosFiltrados.forEach((p) => {
        const vendedorPedido = vendedores.find((v) => v.id === p.notas_venta.clientes.vendedor_id);
        html += `
          <tr>
            <td>${p.notas_venta.folio}</td>
            <td>${p.notas_venta.fecha}</td>
            <td>${p.notas_venta.clientes.nombre_contacto}</td>
            <td>${vendedorPedido?.nombre || 'Sin asignar'}</td>
            <td>${p.productos.nombre}</td>
            <td>${p.cantidad}</td>
            <td>$${p.precio_iva}</td>
            <td>$${(p.cantidad * p.precio_iva).toFixed(2)}</td>
            <td>${p.entregas?.fecha_entrega ? 'Entregado' : 'Pendiente'}</td>
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
      Alert.alert('Error', 'No se pudo exportar el archivo PDF: ' + error.message);
    } finally {
      setCargandoExportar(false);
    }
  };

  // Funciones de navegación
  const editarPedido = (pedido) => {
    setForm({
      id: pedido.id,
      notas_venta_id: pedido.notas_venta_id,
      cliente_id: pedido.notas_venta.clientes.id,
      productos_id: pedido.productos_id,
      cantidad: pedido.cantidad.toString(),
      fecha: pedido.notas_venta.fecha,
      folio: pedido.id.toString(),
      vendedor_id: pedido.notas_venta.clientes.vendedor_id?.toString() || '',
      abono: '',
      descuento: '0',
    });
    setAplicarIva(pedido.notas_venta.iva > 0);
    setMostrarFormulario(true);
  };

  const handleVerDetalles = (pedido) => {
    setMostrarDetalles(pedido);
    setProductosSeleccionados([{
      productos_id: pedido.productos_id,
      cantidad: pedido.cantidad,
      precio_unitario_sin_iva: pedido.precio_venta.toString(),
      precio_unitario_con_iva: pedido.precio_iva.toString(),
      subtotal: (pedido.cantidad * pedido.precio_iva).toString(),
      nombre: pedido.productos.nombre,
    }]);
  };

  const handleVolver = () => {
    setMostrarDetalles(null);
    resetDetalleForm();
  };

  // Configuración de tema
  const inputTheme = {
    colors: { primary: '#3b82f6', text: '#ffffff', placeholder: '#ccc' },
  };

  // Variables calculadas
  const vendedor = mostrarDetalles 
    ? vendedores.find((v) => v.id === mostrarDetalles.notas_venta?.clientes?.vendedor_id)
    : null;
  const pagado = mostrarDetalles 
    ? mostrarDetalles.notas_venta.pago_pendiente <= 0
    : false;
  const subtotalTotal = productosSeleccionados.reduce((acc, p) => acc + Number(p.subtotal || 0), 0);
  const iva = aplicarIva ? subtotalTotal * 0.16 : 0;
  const total = subtotalTotal + iva;

  // RENDER: Vista de detalles
  if (mostrarDetalles) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Detalles del pedido</Text>
          <TouchableOpacity onPress={handleVolver} style={styles.btnVolver}>
            <Text style={styles.botonTexto}>← Volver</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detallesContainer}>
          {/* Información básica */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>{mostrarDetalles.notas_venta.fecha}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Folio:</Text>
              <Text style={styles.infoValue}>{mostrarDetalles.id}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Cliente:</Text>
              <Text style={styles.infoValue}>{mostrarDetalles.notas_venta.clientes.nombre_contacto}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Vendedor:</Text>
              <Text style={styles.infoValue}>{vendedor?.nombre || 'Sin asignar'}</Text>
            </View>
          </View>

          {/* Sección de Productos */}
          <View style={styles.productosSection}>
            <View style={styles.productosHeader}>
              <Text style={styles.subTitle}>Productos</Text>
              <TouchableOpacity
                style={styles.btnAnadirProducto}
                onPress={() => setMostrarFormularioProducto(true)}
                disabled={cargando}
              >
                <Text style={styles.btnAnadirTexto}>+ Añadir producto</Text>
              </TouchableOpacity>
            </View>

            {/* Formulario para añadir producto */}
            {mostrarFormularioProducto && (
              <View style={styles.formularioProducto}>
                <View style={styles.row2}>
                  <View style={styles.col2}>
                    <Text style={styles.label}>Producto</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={detalleForm.productos_id}
                        onValueChange={(value) => handleDetalleChange('productos_id', value)}
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
                  <View style={styles.col2}>
                    <PaperInput
                      label="Cantidad"
                      value={detalleForm.cantidad}
                      onChangeText={(text) => handleDetalleChange('cantidad', text)}
                      mode="outlined"
                      style={styles.input}
                      keyboardType="numeric"
                      theme={inputTheme}
                      textColor="#ffffff"
                      disabled={cargando}
                    />
                  </View>
                </View>
                <View style={styles.botonesFormularioProducto}>
                  <TouchableOpacity
                    style={styles.btnGuardarProducto}
                    onPress={handleAñadirProducto}
                    disabled={cargando}
                  >
                    <Text style={styles.botonTexto}>Añadir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnCancelarProducto}
                    onPress={() => setMostrarFormularioProducto(false)}
                  >
                    <Text style={styles.botonTexto}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Tabla de productos */}
            <View style={styles.tablaProductos}>
              <View style={styles.tablaHeader}>
                <Text style={[styles.tablaHeaderText, { flex: 3 }]}>Nombre</Text>
                <Text style={[styles.tablaHeaderText, { flex: 1 }]}>Cantidad</Text>
                <Text style={[styles.tablaHeaderText, { flex: 1 }]}>Precio Unitario</Text>
                <Text style={[styles.tablaHeaderText, { flex: 1 }]}>Importe</Text>
                <Text style={[styles.tablaHeaderText, { flex: 1 }]}>Estatus</Text>
                <Text style={[styles.tablaHeaderText, { flex: 1 }]}>Acciones</Text>
              </View>

              {/* Producto principal */}
              <View style={styles.tablaFila}>
                <Text style={[styles.tablaCelda, { flex: 3, textAlign: 'left' }]}>
                  {mostrarDetalles.productos.nombre}
                </Text>
                <Text style={[styles.tablaCelda, { flex: 1 }]}>
                  {mostrarDetalles.cantidad} millares
                </Text>
                <Text style={[styles.tablaCelda, { flex: 1 }]}>
                  $ {mostrarDetalles.precio_venta}
                </Text>
                <Text style={[styles.tablaCelda, { flex: 1 }]}>
                  $ {(mostrarDetalles.cantidad * mostrarDetalles.precio_venta).toFixed(0)}
                </Text>
                <View style={[styles.tablaCelda, { flex: 1, alignItems: 'center' }]}>
                  <View style={[
                    styles.estatusPill,
                    mostrarDetalles.entregas?.fecha_entrega ? styles.estatusEntregado : styles.estatusPendiente
                  ]}>
                    <Text style={styles.estatusTexto}>
                      {mostrarDetalles.entregas?.fecha_entrega ? 'Entregado' : 'Pendiente'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.tablaCelda, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
                  <TouchableOpacity 
                    style={styles.accionBtn}
                    onPress={() => editarPedido(mostrarDetalles)}
                  >
                    <Ionicons name="pencil" size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.accionBtnEliminar}
                    onPress={() => handleEliminar(mostrarDetalles.id)}
                  >
                    <Ionicons name="trash" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Productos adicionales */}
              {productosSeleccionados.slice(1).map((producto, index) => (
                <View key={index + 1} style={styles.tablaFila}>
                  <Text style={[styles.tablaCelda, { flex: 3, textAlign: 'left' }]}>
                    {producto.nombre}
                  </Text>
                  <Text style={[styles.tablaCelda, { flex: 1 }]}>
                    {producto.cantidad} millares
                  </Text>
                  <Text style={[styles.tablaCelda, { flex: 1 }]}>
                    $ {producto.precio_unitario_sin_iva}
                  </Text>
                  <Text style={[styles.tablaCelda, { flex: 1 }]}>
                    $ {producto.subtotal}
                  </Text>
                  <View style={[styles.tablaCelda, { flex: 1, alignItems: 'center' }]}>
                    <View style={[styles.estatusPill, styles.estatusPendiente]}>
                      <Text style={styles.estatusTexto}>Pendiente</Text>
                    </View>
                  </View>
                  <View style={[styles.tablaCelda, { flex: 1, flexDirection: 'row', justifyContent: 'center' }]}>
                    <TouchableOpacity 
                      style={styles.accionBtnEliminar}
                      onPress={() => handleEliminarProducto(index + 1)}
                    >
                      <Ionicons name="trash" size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Resumen financiero */}
          <View style={styles.resumenContainer}>
            <View style={styles.resumenIzquierda}>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Sub total:</Text>
                <Text style={styles.resumenValor}>$ {subtotalTotal.toLocaleString('es-CO')}</Text>
              </View>
              
              <View style={styles.facturaRow}>
                <TouchableOpacity 
                  style={[styles.checkbox, { backgroundColor: aplicarIva ? '#3b82f6' : 'transparent' }]}
                  onPress={() => setAplicarIva(!aplicarIva)}
                >
                  {aplicarIva && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                </TouchableOpacity>
                <Text style={styles.resumenLabel}>Factura (IVA 16%)</Text>
              </View>
              
              <View style={styles.resumenFila}>
                <Text style={styles.ivaLabel}>IVA (16%):</Text>
                <Text style={styles.ivaValor}>$ {iva.toFixed(0)}</Text>
              </View>
              
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Descuento:</Text>
                <Text style={styles.resumenValor}>0%</Text>
              </View>
              
              <View style={styles.resumenFila}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValor}>$ {total.toFixed(0)}</Text>
              </View>
            </View>

            <View style={styles.resumenDerecha}>
              <View style={styles.estadoIndicadores}>
                <View style={styles.estadoFila}>
                  <View style={[styles.estadoBarra, { backgroundColor: pagado ? '#22c55e' : '#6b7280' }]} />
                  <Text style={styles.estadoTexto}>$ depósitos</Text>
                </View>
                <View style={styles.estadoFila}>
                  <View style={[styles.estadoBarra, { backgroundColor: mostrarDetalles.entregas?.fecha_entrega ? '#3b82f6' : '#6b7280' }]} />
                  <Text style={styles.estadoTexto}>□ entrega</Text>
                </View>
                <View style={styles.estadoFila}>
                  <View style={[styles.estadoBarra, { backgroundColor: '#eab308' }]} />
                  <Text style={styles.estadoTexto}>≤ crédito</Text>
                </View>
              </View>

              <View style={styles.botonesEstado}>
                <TouchableOpacity
                  style={styles.btnAbonar}
                  onPress={() => handleAbonar(mostrarDetalles.id)}
                  disabled={cargando || pagado}
                >
                  <Text style={styles.btnEstadoTexto}>Abonar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.btnEstado, pagado ? styles.btnPagado : styles.btnSinPagar]}
                  disabled={true}
                >
                  <Text style={styles.btnEstadoTexto}>
                    {pagado ? 'Pagado' : 'Sin pagar'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.btnEstado, mostrarDetalles.entregas?.fecha_entrega ? styles.btnEntregado : styles.btnPendiente]}
                  onPress={() => !mostrarDetalles.entregas?.fecha_entrega && handleEntregar(mostrarDetalles.id)}
                  disabled={cargando || mostrarDetalles.entregas?.fecha_entrega}
                >
                  <Text style={styles.btnEstadoTexto}>
                    {mostrarDetalles.entregas?.fecha_entrega ? 'Entregado' : 'Pendiente'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.diasRestantes}></Text>
            </View>
          </View>

          <View style={styles.imprimirContainer}>
            <TouchableOpacity
              style={styles.btnImprimir}
              onPress={exportarPDF}
              disabled={cargandoExportar}
            >
              {cargandoExportar ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.btnImprimirTexto}>Imprimir Comprobante</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // RENDER: Formulario
  if (mostrarFormulario) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{form.id ? 'Editar Pedido' : 'Nuevo Pedido'}</Text>
          <TouchableOpacity onPress={resetForm} style={styles.btnVolver}>
            <Text style={styles.botonTexto}>← Volver</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.formulario}>
          <View style={styles.row2}>
            <View style={styles.col2}>
              <PaperInput
                label="Folio *"
                value={form.folio || form.id?.toString() || ''}
                onChangeText={(text) => handleChange('folio', text)}
                mode="outlined"
                style={styles.input}
                theme={inputTheme}
                textColor="#ffffff"
                disabled={cargando || form.id}
              />
            </View>
            <View style={styles.col2}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
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
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.cliente_id}
                  onValueChange={(value) => handleChange('cliente_id', value)}
                  style={styles.picker}
                  enabled={!cargando}
                >
                  <Picker.Item label="Seleccionar cliente" value="" />
                  {clientes.map((c) => (
                    <Picker.Item
                      key={c.id}
                      label={`${c.nombre_contacto} (${c.empresa || 'N/A'})`}
                      value={c.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Vendedor *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.vendedor_id}
                  onValueChange={(value) => handleChange('vendedor_id', value)}
                  style={styles.picker}
                  enabled={!cargando}
                >
                  <Picker.Item label="Seleccionar vendedor" value="" />
                  {vendedores.map((v) => (
                    <Picker.Item key={v.id} label={v.nombre} value={v.id} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.subTitle}>Producto Principal</Text>
            <View style={styles.row2}>
              <View style={styles.col2}>
                <Text style={styles.label}>Producto</Text>
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
              <View style={styles.col2}>
                <PaperInput
                  label="Cantidad"
                  value={form.cantidad}
                  onChangeText={(text) => handleChange('cantidad', text)}
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
                  label="Abono inicial (opcional)"
                  value={form.abono}
                  onChangeText={(text) => handleChange('abono', text)}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                  theme={inputTheme}
                  textColor="#ffffff"
                  disabled={cargando}
                />
              </View>
            </View>

            {/* Checkbox para aplicar IVA */}
            <View style={styles.facturaRow}>
              <TouchableOpacity 
                style={[styles.checkbox, { backgroundColor: aplicarIva ? '#3b82f6' : 'transparent' }]}
                onPress={() => setAplicarIva(!aplicarIva)}
              >
                {aplicarIva && <Ionicons name="checkmark" size={16} color="#ffffff" />}
              </TouchableOpacity>
              <Text style={styles.resumenLabel}>Aplicar IVA (16%)</Text>
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
        </ScrollView>
      </View>
    );
  }

  // RENDER: Lista principal
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📦 Pedidos</Text>
        <TouchableOpacity
          style={styles.botonAgregar}
          onPress={() => {
            setMostrarFormulario(true);
            setMostrarDetalles(null);
            resetDetalleForm();
          }}
          disabled={cargando}
        >
          <Ionicons name="add" size={16} color="#ffffff" />
          <Text style={styles.botonTexto}>+ Añadir pedido</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buscador}>
        <Ionicons name="search" size={20} color="#ffffff" />
        <TextInput
          placeholder="Buscar por folio, producto o cliente"
          placeholderTextColor="#cccccc"
          style={styles.inputText}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <View style={styles.botoneraDerecha}>
        <TouchableOpacity
          onPress={exportarExcel}
          style={styles.btnExportarExcel}
          disabled={cargandoExportar}
        >
          {cargandoExportar ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons name="download" size={16} color="#ffffff" />
              <Text style={styles.botonTexto}>Excel</Text>
            </>
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
            <>
              <Ionicons name="document-text" size={16} color="#ffffff" />
              <Text style={styles.botonTexto}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {cargando && (
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
            const vendedorPedido = vendedores.find((v) => v.id === p.notas_venta.clientes.vendedor_id);
            const pagadoPedido = p.notas_venta.pago_pendiente <= 0;

            return (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardGrid}>
                  <View style={styles.infoCompleta}>
                    <Text style={styles.nombre}>Folio: {p.id}</Text>
                    <Text style={styles.info}>Cliente: {p.notas_venta.clientes.nombre_contacto}</Text>
                    
                    <Text style={styles.label}>Material:</Text>
                    <View style={styles.materialTags}>
                      <View style={styles.materialTag}>
                        <Text style={styles.materialTagText}>{p.productos.material || 'N/A'}</Text>
                      </View>
                      {p.productos.tipo && (
                        <View style={styles.tipoMaterialTag}>
                          <Text style={styles.tipoMaterialTagText}>{p.productos.tipo}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.statusIndicators}>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusBar, { backgroundColor: pagadoPedido ? '#22c55e' : '#e5e7eb' }]} />
                      <Text style={styles.statusLabel}>$ depósitos</Text>
                    </View>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusBar, { backgroundColor: p.entregas?.fecha_entrega ? '#3b82f6' : '#e5e7eb' }]} />
                      <Text style={styles.statusLabel}>□ entrega</Text>
                    </View>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusBar, { backgroundColor: '#eab308' }]} />
                      <Text style={styles.statusLabel}>≤ crédito</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.botonesCard}>
                  <TouchableOpacity
                    onPress={() => handleVerDetalles(p)}
                    style={styles.btnVerDetalles}
                  >
                    <Ionicons name="eye" size={16} color="#ffffff" />
                    <Text style={styles.botonTexto}>Ver detalles</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => editarPedido(p)}
                    style={styles.btnEditar}
                    disabled={cargando}
                  >
                    <Ionicons name="pencil" size={16} color="#ffffff" />
                    <Text style={styles.botonTexto}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleEliminar(p.id)}
                    style={styles.btnEliminar}
                    disabled={cargando}
                  >
                    <Ionicons name="trash" size={16} color="#ffffff" />
                    <Text style={styles.botonTexto}>Eliminar</Text>
                  </TouchableOpacity>

                  {!pagadoPedido && (
                    <TouchableOpacity
                      onPress={() => handleAbonar(p.id)}
                      style={styles.btnAbonar}
                      disabled={cargando}
                    >
                      <Ionicons name="cash" size={16} color="#ffffff" />
                      <Text style={styles.botonTexto}>$ Abonar</Text>
                    </TouchableOpacity>
                  )}

                  {!p.entregas?.fecha_entrega && (
                    <TouchableOpacity
                      onPress={() => handleEntregar(p.id)}
                      style={styles.btnEntregar}
                      disabled={cargando}
                    >
                      <Ionicons name="cube" size={16} color="#ffffff" />
                      <Text style={styles.botonTexto}>📦 Entregar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  buscador: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputText: {
    color: '#ffffff',
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 16,
  },
  botoneraDerecha: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  botonAgregar: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnExportarExcel: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnExportarPDF: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnEliminar: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnEditar: {
    backgroundColor: '#eab308',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnAbonar: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnEntregar: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnVerDetalles: {
    backgroundColor: '#6b7280',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnVolver: {
    backgroundColor: '#6b7280',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  botonTexto: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  lista: { flex: 1 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoCompleta: {
    flex: 3,
    paddingRight: 12,
  },
  nombre: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#ffffff', 
    marginBottom: 4 
  },
  info: { 
    color: '#cbd5e1', 
    fontSize: 14, 
    marginTop: 4 
  },
  materialTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  materialTag: {
    backgroundColor: '#4b5563',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  materialTagText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  tipoMaterialTag: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tipoMaterialTagText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  statusIndicators: {
    flex: 2,
    alignItems: 'flex-end',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBar: {
    width: 24,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  botonesCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  detallesContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
  },
  formulario: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 4,
    marginTop: 8,
    fontWeight: '500',
  },
  subTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  section: {
    marginBottom: 16,
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
  // Estilos para detalles
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: '20%',
  },
  infoLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productosSection: {
    marginBottom: 16,
  },
  productosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  btnAnadirProducto: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6b7280',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnAnadirTexto: {
    color: '#ffffff',
    fontSize: 12,
  },
  formularioProducto: {
    backgroundColor: '#4b5563',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  botonesFormularioProducto: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  btnGuardarProducto: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnCancelarProducto: {
    backgroundColor: '#6b7280',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  tablaProductos: {
    backgroundColor: '#334155',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tablaHeader: {
    flexDirection: 'row',
    backgroundColor: '#4b5563',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tablaHeaderText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tablaFila: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tablaCelda: {
    color: '#cbd5e1',
    fontSize: 12,
    textAlign: 'center',
  },
  estatusPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  estatusTexto: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  estatusEntregado: {
    backgroundColor: '#22c55e',
  },
  estatusPendiente: {
    backgroundColor: '#eab308',
  },
  accionBtn: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#374151',
  },
  accionBtnEliminar: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  resumenContainer: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 16,
  },
  resumenIzquierda: {
    flex: 1,
  },
  resumenDerecha: {
    flex: 1,
    alignItems: 'flex-end',
  },
  resumenFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resumenLabel: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  resumenValor: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  facturaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ivaLabel: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ivaValor: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValor: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  estadoIndicadores: {
    marginBottom: 16,
  },
  estadoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  estadoBarra: {
    width: 24,
    height: 6,
    borderRadius: 3,
  },
  estadoTexto: {
    color: '#cbd5e1',
    fontSize: 11,
  },
  botonesEstado: {
    gap: 8,
    marginBottom: 16,
  },
  btnEstado: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  btnPagado: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  btnSinPagar: {
    backgroundColor: 'transparent',
    borderColor: '#6b7280',
  },
  btnEntregado: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  btnPendiente: {
    backgroundColor: 'transparent',
    borderColor: '#6b7280',
  },
  btnEstadoTexto: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
  },
  diasRestantes: {
    color: '#6b7280',
    fontSize: 11,
    fontStyle: 'italic',
  },
  imprimirContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  btnImprimir: {
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  btnImprimirTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Estilos para formulario
  row2: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  col2: {
    flex: 1,
    minWidth: '45%',
  },
  input: {
    backgroundColor: '#1e293b',
    marginBottom: 12,
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
  botonesForm: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
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
});