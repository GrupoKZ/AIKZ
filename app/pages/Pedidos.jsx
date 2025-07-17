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
  const [mostrarDetalles, setMostrarDetalles] = useState(null);
  const [form, setForm] = useState({
    id: null,
    notas_venta_id: '',
    cliente_id: '',
    productos_id: '',
    cantidad: '',
    precio_unitario_sin_iva: '',
    precio_unitario_con_iva: '',
    subtotal: '',
    fecha: new Date().toISOString().split('T')[0],
    folio: '',
    vendedor_id: '',
    status: 'Pendiente',
    pago_pendiente: '',
    abono: '',
    descuento: '',
  });
  const [detalleForm, setDetalleForm] = useState({
    pedido_id: null,
    productos_id: '',
    cantidad: '',
    descuento: '',
  });
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);

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
        .select(`
          *,
          notas_venta!inner(
            id,
            folio,
            fecha,
            cliente_id,
            pago_pendiente,
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

      if (error) {
        console.error('Error fetching pedidos:', error.message);
        Alert.alert('Error', 'No se pudieron cargar los pedidos: ' + error.message);
        return;
      }

      // Filtrar registros que tengan todas las relaciones necesarias
      const pedidosValidos = (data || []).filter(pedido => 
        pedido && 
        pedido.notas_venta && 
        pedido.notas_venta.clientes && 
        pedido.productos
      );

      setPedidos(pedidosValidos);
    } catch (error) {
      console.error('Error en fetchPedidos:', error.message);
      Alert.alert('Error', 'Error inesperado al cargar pedidos: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const fetchNotasVenta = async () => {
    try {
      const { data, error } = await supabase
        .from('notas_venta')
        .select(`
          id, 
          folio, 
          fecha, 
          cliente_id, 
          pago_pendiente,
          clientes!inner(
            nombre_contacto, 
            vendedor_id
          )
        `)
        .order('folio', { ascending: true });

      if (error) {
        console.error('Error fetching notas_venta:', error.message);
        return;
      }
      setNotasVenta(data || []);
    } catch (error) {
      console.error('Error en fetchNotasVenta:', error.message);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre_contacto, empresa, vendedor_id')
        .order('nombre_contacto', { ascending: true });

      if (error) {
        console.error('Error fetching clientes:', error.message);
        return;
      }
      setClientes(data || []);
    } catch (error) {
      console.error('Error en fetchClientes:', error.message);
    }
  };

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, material, tipo, ancho_cm, largo_cm, micraje_um')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error fetching productos:', error.message);
        return;
      }
      setProductos(data || []);
    } catch (error) {
      console.error('Error en fetchProductos:', error.message);
    }
  };

  const fetchEntregas = async () => {
    try {
      const { data, error } = await supabase
        .from('entregas')
        .select('id, pedido_id, cantidad, unidades, fecha_entrega')
        .order('fecha_entrega', { ascending: true });

      if (error) {
        console.error('Error fetching entregas:', error.message);
        return;
      }
      setEntregas(data || []);
    } catch (error) {
      console.error('Error en fetchEntregas:', error.message);
    }
  };

  const fetchVendedores = async () => {
    try {
      const { data, error } = await supabase
        .from('vendedores')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error fetching vendedores:', error.message);
        return;
      }
      setVendedores(data || []);
    } catch (error) {
      console.error('Error en fetchVendedores:', error.message);
    }
  };

  // Filtro seguro para pedidos
  const pedidosFiltrados = pedidos.filter((p) => {
    if (!p || !p.productos || !p.notas_venta) return false;
    
    const productoNombre = p.productos.nombre || '';
    const notaFolio = p.notas_venta.folio || '';
    const busquedaLower = busqueda.toLowerCase();
    
    return (
      productoNombre.toLowerCase().includes(busquedaLower) ||
      notaFolio.toLowerCase().includes(busquedaLower)
    );
  });

  const handleChange = (campo, valor) => {
    let newValue = valor;
    // Remove leading zero if a new number is entered
    if (campo !== 'folio' && newValue && !isNaN(newValue) && newValue.length > 1 && newValue.startsWith('0') && !newValue.startsWith('0.')) {
      newValue = newValue.replace(/^0+/, '');
    }
    setForm((prev) => ({ ...prev, [campo]: newValue }));
  };

  const handleDetalleChange = (campo, valor) => {
    let newValue = valor;
    // Remove leading zero if a new number is entered
    if (campo !== 'pedido_id' && newValue && !isNaN(newValue) && newValue.length > 1 && newValue.startsWith('0') && !newValue.startsWith('0.')) {
      newValue = newValue.replace(/^0+/, '');
    }
    setDetalleForm((prev) => ({ ...prev, [campo]: newValue }));
  };

  const calculateSubtotal = (cantidad, productos_id, descuento = '0') => {
    const cantidadNum = Number(cantidad || '0');
    const producto = productos.find((p) => p.id === Number(productos_id || ''));
    const descuentoNum = Number(descuento || '0');
    const precioPorKilo = 1; // Placeholder; replace with actual value from database

    if (producto && cantidadNum > 0) {
      let kgm = 0;
      if (producto.tipo === 'MORDAZA') {
        kgm = (((producto.largo_cm * (producto.ancho_cm + 2)) * 2 * producto.micraje_um) / 10000) * precioPorKilo;
      } else if (producto.tipo === 'LATERAL') {
        kgm = (((producto.largo_cm * producto.ancho_cm) * 2 * producto.micraje_um) / 10000) * precioPorKilo;
      } else if (producto.tipo === 'PEGOL') {
        kgm = (((producto.largo_cm * (producto.ancho_cm + 3)) * 2 * producto.micraje_um) / 10000) * precioPorKilo + (producto.largo_cm * 0.12) + 13;
      } else if (producto.tipo === 'CENEFA + PEGOL') {
        kgm = (((producto.largo_cm * (producto.ancho_cm + 6)) * 2 * producto.micraje_um) / 10000) * precioPorKilo + (producto.largo_cm * 0.21) + 20;
      } else if (producto.material === 'POLIETILENO') {
        kgm = precioPorKilo;
      }

      const precioBase = kgm;
      const precioConIva = precioBase * 1.16;
      const subtotalSinDescuento = cantidadNum * precioConIva;
      const descuentoTotal = (subtotalSinDescuento * descuentoNum) / 100;
      const subtotal = subtotalSinDescuento - descuentoTotal;

      return {
        precio_unitario_sin_iva: precioBase.toString(),
        precio_unitario_con_iva: precioConIva.toString(),
        subtotal: subtotal.toString(),
      };
    }
    return {
      precio_unitario_sin_iva: '0',
      precio_unitario_con_iva: '0',
      subtotal: '0',
    };
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
      cantidad: '',
      precio_unitario_sin_iva: '',
      precio_unitario_con_iva: '',
      subtotal: '',
      fecha: new Date().toISOString().split('T')[0],
      folio: '',
      vendedor_id: '',
      status: 'Pendiente',
      pago_pendiente: '',
      abono: '',
      descuento: '',
    });
    setMostrarFormulario(false);
  };

  const resetDetalleForm = () => {
    setDetalleForm({
      pedido_id: null,
      productos_id: '',
      cantidad: '',
      descuento: '',
    });
    setProductosSeleccionados([]);
  };

  const handleGuardar = async () => {
    const { notas_venta_id, cliente_id, productos_id, cantidad, precio_unitario_sin_iva, precio_unitario_con_iva, subtotal, fecha, folio, vendedor_id, status, id, abono, pago_pendiente, descuento } = form;

    if (!folio || !cliente_id || !fecha || !vendedor_id) {
      console.log('Validation failed:', { folio, cliente_id, fecha, vendedor_id });
      return Alert.alert('Campos requeridos', 'Folio, cliente, fecha y vendedor son obligatorios.');
    }

    const cantidadNum = Number(cantidad) || 0;
    const precioSinIvaNum = Number(precio_unitario_sin_iva) || 0;
    const precioConIvaNum = Number(precio_unitario_con_iva) || 0;
    const subtotalNum = Number(subtotal) || 0;
    const abonoNum = Number(abono) || 0;
    const pagoPendienteNum = Number(pago_pendiente) || 0;
    const descuentoNum = Number(descuento) || 0;

    if ((cantidadNum <= 0 && productosSeleccionados.length === 0) || isNaN(cantidadNum)) {
      console.log('Cantidad validation failed:', cantidadNum, productosSeleccionados.length);
      return Alert.alert('Error', 'La cantidad debe ser un número mayor a 0 si hay productos.');
    }
    if (precioSinIvaNum < 0 || isNaN(precioSinIvaNum)) {
      console.log('Precio sin IVA validation failed:', precioSinIvaNum);
      return Alert.alert('Error', 'El precio sin IVA debe ser un número válido.');
    }
    if (precioConIvaNum < 0 || isNaN(precioConIvaNum)) {
      console.log('Precio con IVA validation failed:', precioConIvaNum);
      return Alert.alert('Error', 'El precio con IVA debe ser un número válido.');
    }
    if (subtotalNum < 0 || isNaN(subtotalNum)) {
      console.log('Subtotal validation failed:', subtotalNum);
      return Alert.alert('Error', 'El subtotal debe ser un número válido.');
    }
    if (abonoNum < 0 || isNaN(abonoNum)) {
      console.log('Abono validation failed:', abonoNum);
      return Alert.alert('Error', 'El abono debe ser un número válido.');
    }
    if (pagoPendienteNum < 0 || isNaN(pagoPendienteNum)) {
      console.log('Pago pendiente validation failed:', pagoPendienteNum);
      return Alert.alert('Error', 'El pago pendiente debe ser un número válido.');
    }
    if (descuentoNum < 0 || isNaN(descuentoNum)) {
      console.log('Descuento validation failed:', descuentoNum);
      return Alert.alert('Error', 'El descuento debe ser un número válido.');
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
        descuento: descuentoNum,
      };
      let notaVentaId;
      if (!id) {
        const { data: notaData, error: notaError } = await supabase
          .from('notas_venta')
          .insert([notaVentaData])
          .select('id');
        if (notaError) {
          console.error('Error inserting nota_venta:', notaError.message);
          throw notaError;
        }
        notaVentaId = notaData[0].id;
      } else {
        notaVentaId = notas_venta_id;
        const { error: notaUpdateError } = await supabase.from('notas_venta').update(notaVentaData).eq('id', notaVentaId);
        if (notaUpdateError) {
          console.error('Error updating nota_venta:', notaUpdateError.message);
          throw notaUpdateError;
        }
      }

      const cliente = clientes.find((c) => c.id === Number(cliente_id));
      if (cliente && cliente.vendedor_id !== Number(vendedor_id)) {
        const { error: clienteUpdateError } = await supabase.from('clientes').update({ vendedor_id }).eq('id', cliente_id);
        if (clienteUpdateError) {
          console.error('Error updating cliente:', clienteUpdateError.message);
          throw clienteUpdateError;
        }
      }

      if (productosSeleccionados.length > 0) {
        const pedidosData = productosSeleccionados.map((p) => ({
          notas_venta_id: notaVentaId,
          productos_id: p.productos_id,
          cantidad: Number(p.cantidad),
          precio_kilo_venta: Number(p.precio_unitario_sin_iva) / ((Number(p.cantidad) * 25) / 10000),
          precio_venta: Number(p.precio_unitario_sin_iva),
          price_iva: Number(p.precio_unitario_con_iva),
        }));
        const { error: pedidosInsertError } = await supabase.from('pedidos').insert(pedidosData);
        if (pedidosInsertError) {
          console.error('Error inserting pedidos:', pedidosInsertError.message);
          throw pedidosInsertError;
        }
      } else if (productos_id && cantidadNum > 0) {
        const dataEnviar = {
          notas_venta_id: notaVentaId,
          productos_id,
          cantidad: cantidadNum,
          precio_kilo_venta: precioSinIvaNum / ((cantidadNum * 25) / 10000),
          precio_venta: precioSinIvaNum,
          precio_iva: precioConIvaNum,
        };
        const { error } = id
          ? await supabase.from('pedidos').update(dataEnviar).eq('id', id)
          : await supabase.from('pedidos').insert([dataEnviar]);
        if (error) {
          console.error('Error saving pedido:', error.message);
          throw error;
        }
      }

      const entregaData = { pedido_id: id || null, cantidad: cantidadNum, unidades: 'millares', fecha_entrega: status === 'Entregado' ? new Date().toISOString().split('T')[0] : null };
      if (!id && productosSeleccionados.length > 0) {
        await supabase.from('entregas').insert([{ ...entregaData, pedido_id: null }]); // Adjust logic for multiple products
      } else if (!id) {
        const { error: entregaInsertError } = await supabase.from('entregas').insert([entregaData]);
        if (entregaInsertError) {
          console.error('Error inserting entrega:', entregaInsertError.message);
          throw entregaInsertError;
        }
      } else {
        const { error: entregaUpdateError } = await supabase.from('entregas').update(entregaData).eq('pedido_id', id);
        if (entregaUpdateError) {
          console.error('Error updating entrega:', entregaUpdateError.message);
          throw entregaUpdateError;
        }
      }

      Alert.alert('Éxito', id ? 'Pedido actualizado correctamente' : 'Pedido creado correctamente');
      resetForm();
      fetchPedidos();
    } catch (error) {
      console.error('Error en handleGuardar:', error.message);
      Alert.alert('Error', 'Error inesperado al guardar el pedido: ' + error.message);
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
              const pedido = pedidos.find((p) => p.id === id);
              const { error: pedidoError } = await supabase.from('pedidos').delete().eq('id', id);
              const { error: entregaError } = await supabase.from('entregas').delete().eq('pedido_id', id);
              const { error: notaError } = await supabase.from('notas_venta').delete().eq('id', pedido.notas_venta_id);

              if (pedidoError || entregaError || notaError) {
                console.error('Deletion errors:', { pedidoError, entregaError, notaError });
                Alert.alert('Error', 'No se pudo eliminar el pedido o datos relacionados.');
                return;
              }

              Alert.alert('Éxito', 'Pedido eliminado correctamente');
              fetchPedidos();
            } catch (error) {
              console.error('Error en handleEliminar:', error.message);
              Alert.alert('Error', 'Error inesperado al eliminar el pedido: ' + error.message);
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
    const entregaData = { pedido_id: id, cantidad: pedido.cantidad, unidades: pedido.unidades || 'millares', fecha_entrega: new Date().toISOString().split('T')[0] };

    try {
      setCargando(true);
      const { error } = await supabase
        .from('entregas')
        .upsert(entregaData, { onConflict: 'pedido_id' });

      if (error) {
        console.error('Error en handleEntregar upsert:', error.message);
        throw error;
      }

      const { error: statusError } = await supabase
        .from('pedidos')
        .update({ status: 'Entregado' })
        .eq('id', id);

      if (statusError) {
        console.error('Error updating status:', statusError.message);
        throw statusError;
      }

      Alert.alert('Éxito', 'Pedido marcado como entregado');
      fetchPedidos();
    } catch (error) {
      console.error('Error en handleEntregar:', error.message);
      Alert.alert('Error', 'Error al marcar como entregado: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleAbonar = async (id) => {
    const abonoNum = Number(form.abono) || 0;
    const pedido = pedidos.find((p) => p.id === id);
    
    if (!pedido || !pedido.notas_venta) {
      return Alert.alert('Error', 'No se pudo encontrar la información del pedido.');
    }

    const nuevoPagoPendiente = pedido.notas_venta.pago_pendiente - abonoNum;

    if (abonoNum <= 0 || isNaN(abonoNum)) {
      console.log('Abono validation failed:', abonoNum);
      return Alert.alert('Error', 'El abono debe ser un número mayor a 0.');
    }
    if (abonoNum > pedido.notas_venta.pago_pendiente) {
      console.log('Abono exceeds payment pending:', { abonoNum, pagoPendiente: pedido.notas_venta.pago_pendiente });
      return Alert.alert('Error', 'El abono no puede exceder el pago pendiente.');
    }

    try {
      setCargando(true);
      const { error } = await supabase
        .from('notas_venta')
        .update({ pago_pendiente: nuevoPagoPendiente })
        .eq('id', pedido.notas_venta_id);

      if (error) {
        console.error('Error en handleAbonar:', error.message);
        throw error;
      }

      Alert.alert('Éxito', 'Abono registrado correctamente');
      resetForm();
      fetchPedidos();
    } catch (error) {
      console.error('Error en handleAbonar:', error.message);
      Alert.alert('Error', 'Error al registrar el abono: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleAñadirProducto = () => {
    const { productos_id, cantidad, descuento } = detalleForm;

    if (!productos_id || !cantidad) {
      console.log('Required fields missing:', { productos_id, cantidad });
      return Alert.alert('Campos requeridos', 'Debe seleccionar un producto y especificar una cantidad.');
    }

    const cantidadNum = Number(cantidad) || 0;
    const descuentoNum = Number(descuento) || 0;
    if (cantidadNum <= 0 || isNaN(cantidadNum)) {
      console.log('Cantidad validation failed:', cantidadNum);
      return Alert.alert('Error', 'La cantidad debe ser un número mayor a 0.');
    }
    if (descuentoNum < 0 || isNaN(descuentoNum)) {
      console.log('Descuento validation failed:', descuentoNum);
      return Alert.alert('Error', 'El descuento debe ser un número válido.');
    }

    const { precio_unitario_sin_iva, precio_unitario_con_iva, subtotal } = calculateSubtotal(cantidad, productos_id, descuento);
    const nuevoProducto = {
      productos_id,
      cantidad: cantidadNum,
      precio_unitario_sin_iva,
      precio_unitario_con_iva,
      subtotal,
      descuento: descuentoNum,
    };

    setProductosSeleccionados((prev) => [...prev, nuevoProducto]);
    const nuevoSubtotalTotal = productosSeleccionados.reduce((acc, p) => acc + Number(p.subtotal), 0) + Number(subtotal);
    handleChange('subtotal', nuevoSubtotalTotal.toString());
    handleChange('pago_pendiente', nuevoSubtotalTotal.toString());
    resetDetalleForm();
  };

  const exportarExcel = async () => {
    try {
      setCargandoExportar(true);

      if (pedidosFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay pedidos para exportar.');
        return;
      }

      const datos = pedidosFiltrados.map((p) => {
        const vendedor = vendedores.find((v) => v.id === p.notas_venta?.clientes?.vendedor_id);
        const pagado = (p.notas_venta?.pago_pendiente || 0) <= 0;
        return {
          Folio: p.notas_venta?.folio || 'N/A',
          Fecha: p.notas_venta?.fecha || 'N/A',
          Cliente: `${p.notas_venta?.clientes?.nombre_contacto || 'N/A'} (${p.notas_venta?.clientes?.empresa || 'N/A'})`,
          Vendedor: vendedor ? vendedor.nombre : 'Sin asignar',
          Material: p.productos?.material || 'N/A',
          Cantidad: p.cantidad || 0,
          'Precio Unitario (sin IVA)': p.precio_venta || 0,
          'Precio Unitario (con IVA)': p.precio_iva || 0,
          Subtotal: ((p.cantidad || 0) * (p.precio_iva || 0)).toLocaleString('es-CO'),
          'Pago Pendiente': (p.notas_venta?.pago_pendiente || 0).toLocaleString('es-CO'),
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
      console.error('Error exportando Excel:', error.message);
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
      console.error('Error exportando PDF:', error.message);
      Alert.alert('Error', 'No se pudo exportar el archivo PDF: ' + error.message);
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
      abono: '',
      descuento: '',
    });
    setMostrarFormulario(true);
  };

  const handleVerDetalles = (pedido) => {
    setMostrarDetalles(pedido);
    setDetalleForm({ ...detalleForm, pedido_id: pedido.id });
    setProductosSeleccionados([{
      productos_id: pedido.productos_id,
      cantidad: pedido.cantidad,
      precio_unitario_sin_iva: pedido.precio_venta.toString(),
      precio_unitario_con_iva: pedido.precio_iva.toString(),
      subtotal: (pedido.cantidad * pedido.precio_iva).toString(),
      descuento: '0',
    }]);
    handleChange('subtotal', (pedido.cantidad * pedido.precio_iva).toString());
    handleChange('pago_pendiente', pedido.notas_venta.pago_pendiente.toString());
  };

  const handleVolver = () => {
    setMostrarDetalles(null);
    resetDetalleForm();
  };

  const inputTheme = {
    colors: { primary: '#3b82f6', text: '#ffffff', placeholder: '#ccc' },
  };

  if (mostrarDetalles || mostrarFormulario) {
    let pagado;
    let iva;
    const subtotalTotal = productosSeleccionados.reduce((acc, p) => acc + Number(p.subtotal || 0), 0);
    const vendedor = vendedores.find((v) => v.id === (mostrarDetalles?.notas_venta?.clientes?.vendedor_id || form.vendedor_id));

    if (mostrarFormulario) {
      pagado = Number(form.pago_pendiente) <= 0;
      iva = productosSeleccionados.reduce((acc, p) => acc + (Number(p.cantidad || 0) * (Number(p.precio_unitario_con_iva || 0) - Number(p.precio_unitario_sin_iva || 0))), 0);
    } else {
      pagado = mostrarDetalles.notas_venta.pago_pendiente <= 0;
      iva = (mostrarDetalles.cantidad * (mostrarDetalles.precio_iva - mostrarDetalles.precio_venta)) || 0;
    }

    if (mostrarFormulario) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{form.id ? 'Editar Pedido' : 'Nuevo Pedido'}</Text>
          </View>
          <ScrollView style={styles.formulario}>
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
              </View>
              <View style={styles.col2}>
                <Text style={styles.label}>Vendedor *</Text>
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
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.subTitle}>Añadir Producto</Text>
              <View style={styles.row2}>
                <View style={styles.col2}>
                  <Text style={styles.label}>Producto</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={detalleForm.productos_id}
                      onValueChange={(value) => handleDetalleChange('productos_id', value)}
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
                    placeholder="0"
                  />
                </View>
              </View>
              <View style={styles.row2}>
                <View style={styles.col2}>
                  <PaperInput
                    label="Descuento (%)"
                    value={detalleForm.descuento}
                    onChangeText={(text) => handleDetalleChange('descuento', text)}
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
              <TouchableOpacity
                style={styles.btnGuardar}
                onPress={handleAñadirProducto}
                disabled={cargando}
              >
                {cargando ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.botonTexto}>Añadir Producto</Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.financialGrid}>
              <View style={styles.financialCard}>
                <Text style={styles.subTitle}>Resumen</Text>
                <View style={styles.financialRow}>
                  <Text style={styles.label}>Subtotal:</Text>
                  <Text style={styles.text}>${subtotalTotal.toLocaleString('es-CO')}</Text>
                </View>
                <View style={styles.financialRow}>
                  <Text style={styles.label}>IVA (16%):</Text>
                  <Text style={styles.text}>${iva.toLocaleString('es-CO')}</Text>
                </View>
                <View style={[styles.financialRow, styles.totalRow]}>
                  <Text style={styles.text}>Total:</Text>
                  <Text style={styles.text}>${subtotalTotal.toLocaleString('es-CO')}</Text>
                </View>
              </View>
              <View style={styles.financialCard}>
                <Text style={styles.subTitle}>Estado de Pago</Text>
                <View style={styles.financialRow}>
                  <Text style={styles.label}>Abono:</Text>
                  <PaperInput
                    value={form.abono}
                    onChangeText={(text) => handleChange('abono', text)}
                    mode="outlined"
                    style={[styles.input, { backgroundColor: '#1e293b' }]}
                    keyboardType="numeric"
                    theme={inputTheme}
                    textColor="#ffffff"
                    disabled={cargando}
                    placeholder="0"
                  />
                </View>
                <View style={styles.financialRow}>
                  <Text style={styles.label}>Pago Pendiente:</Text>
                  <Text style={styles.text}>${form.pago_pendiente}</Text>
                </View>
                <View style={[styles.financialRow, styles.totalRow]}>
                  <Text style={styles.text}>Estado:</Text>
                  <Text style={[styles.text, pagado ? styles.textPagado : styles.textPendiente]}>
                    {pagado ? 'Pagado' : 'Pendiente'}
                  </Text>
                </View>
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

    // Scope for mostrarDetalles
    const { precio_unitario_sin_iva, precio_unitario_con_iva, subtotal, pago_pendiente } = calculateSubtotal(mostrarDetalles.cantidad, mostrarDetalles.productos_id);

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Detalles del Pedido</Text>
          <TouchableOpacity
            onPress={handleVolver}
            style={styles.btnVolver}
          >
            <Text style={styles.botonTexto}>← Volver</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detallesContainer}>
          <View style={styles.detallesGrid}>
            <View>
              <Text style={styles.label}>Fecha:</Text>
              <Text style={styles.text}>{mostrarDetalles.notas_venta.fecha}</Text>
            </View>
            <View>
              <Text style={styles.label}>Folio:</Text>
              <Text style={styles.text}>{mostrarDetalles.notas_venta.folio}</Text>
            </View>
            <View>
              <Text style={styles.label}>Cliente:</Text>
              <Text style={styles.text}>{mostrarDetalles.notas_venta.clientes.nombre_contacto}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Vendedor:</Text>
            <Text style={styles.text}>{vendedor ? vendedor.nombre : 'Sin asignar'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.subTitle}>Productos</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Nombre</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Cantidad</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Precio Unitario</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Estatus</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{mostrarDetalles.productos.nombre}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{mostrarDetalles.cantidad}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>${mostrarDetalles.precio_venta}</Text>
                <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', alignItems: 'center' }]}>
                  <Text style={[
                    styles.statusTag,
                    mostrarDetalles.entregas?.fecha_entrega ? styles.statusEntregado : styles.statusPendiente
                  ]}>
                    {mostrarDetalles.entregas?.fecha_entrega ? 'Entregado' : 'Pendiente'}
                  </Text>
                  {mostrarDetalles.entregas?.fecha_entrega && (
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" style={{ marginLeft: 5 }} />
                  )}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.subTitle}>Añadir Producto</Text>
            <View style={styles.row2}>
              <View style={styles.col2}>
                <Text style={styles.label}>Producto</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={detalleForm.productos_id}
                    onValueChange={(value) => handleDetalleChange('productos_id', value)}
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
                  placeholder="0"
                />
              </View>
            </View>
            <View style={styles.row2}>
              <View style={styles.col2}>
                <PaperInput
                  label="Descuento (%)"
                  value={detalleForm.descuento}
                  onChangeText={(text) => handleDetalleChange('descuento', text)}
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
            <TouchableOpacity
              style={styles.btnGuardar}
              onPress={handleAñadirProducto}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.botonTexto}>Añadir Producto</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.financialGrid}>
            <View style={styles.financialCard}>
              <Text style={styles.subTitle}>Resumen</Text>
              <View style={styles.financialRow}>
                <Text style={styles.label}>Subtotal:</Text>
                <Text style={styles.text}>${(mostrarDetalles.cantidad * mostrarDetalles.precio_iva).toLocaleString('es-CO')}</Text>
              </View>
              <View style={styles.financialRow}>
                <Text style={styles.label}>IVA (16%):</Text>
                <Text style={styles.text}>${iva.toLocaleString('es-CO')}</Text>
              </View>
              <View style={[styles.financialRow, styles.totalRow]}>
                <Text style={styles.text}>Total:</Text>
                <Text style={styles.text}>${(mostrarDetalles.cantidad * mostrarDetalles.precio_iva).toLocaleString('es-CO')}</Text>
              </View>
            </View>
            <View style={styles.financialCard}>
              <Text style={styles.subTitle}>Estado de Pago</Text>
              <View style={styles.financialRow}>
                <Text style={styles.label}>Abono:</Text>
                <PaperInput
                  value={form.abono}
                  onChangeText={(text) => handleChange('abono', text)}
                  mode="outlined"
                  style={[styles.input, { backgroundColor: '#1e293b' }]}
                  keyboardType="numeric"
                  theme={inputTheme}
                  textColor="#ffffff"
                  disabled={cargando}
                  placeholder="0"
                />
              </View>
              <View style={styles.financialRow}>
                <Text style={styles.label}>Pago Pendiente:</Text>
                <Text style={styles.text}>${pago_pendiente}</Text>
              </View>
              <View style={[styles.financialRow, styles.totalRow]}>
                <Text style={styles.text}>Estado:</Text>
                <Text style={[styles.text, pagado ? styles.textPagado : styles.textPendiente]}>
                  {pagado ? 'Pagado' : 'Pendiente'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => handleAbonar(mostrarDetalles.id)}
              style={styles.btnAbonar}
              disabled={cargando || pagado}
            >
              <Ionicons name="cash" size={16} color="#ffffff" />
              <Text style={styles.botonTexto}>Abonar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => editarPedido(mostrarDetalles)}
              style={styles.btnEditar}
              disabled={cargando}
            >
              <Ionicons name="pencil" size={16} color="#ffffff" />
              <Text style={styles.botonTexto}>Editar</Text>
            </TouchableOpacity>
            {!mostrarDetalles.entregas?.fecha_entrega && (
              <TouchableOpacity
                onPress={() => handleEntregar(mostrarDetalles.id)}
                style={styles.btnEntregar}
                disabled={cargando}
              >
                <Ionicons name="cube" size={16} color="#ffffff" />
                <Text style={styles.botonTexto}>Entregar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                exportarPDF();
              }}
              style={styles.btnImprimir}
              disabled={cargandoExportar}
            >
              {cargandoExportar ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="document-text" size={16} color="#ffffff" />
                  <Text style={styles.botonTexto}>Imprimir Comprobante</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleEliminar(mostrarDetalles.id)}
              style={styles.btnEliminar}
              disabled={cargando}
            >
              <Ionicons name="trash" size={16} color="#ffffff" />
              <Text style={styles.botonTexto}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

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
          <Text style={styles.botonTexto}>Agregar pedido</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buscador}>
        <Ionicons name="search" size={20} color="#ffffff" />
        <TextInput
          placeholder="Buscar por folio o producto"
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
            const vendedor = vendedores.find((v) => v.id === p.notas_venta.clientes.vendedor_id);
            const pagado = p.notas_venta.pago_pendiente <= 0;

            return (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardGrid}>
                  <View>
                    <Text style={styles.nombre}>Folio: {p.notas_venta.folio || 'N/A'}</Text>
                    <Text style={styles.info}>Cliente: {p.notas_venta.clientes.nombre_contacto}</Text>
                  </View>
                  <View>
                    <Text style={styles.label}>Material:</Text>
                    <View style={styles.materialTags}>
                      <Text style={styles.materialTag}>{p.productos.material || 'N/A'}</Text>
                      <Text style={styles.tipoMaterialTag}>{p.productos.tipo || 'N/A'}</Text>
                    </View>
                  </View>
                  <View style={styles.statusContainer}>
                    <View style={styles.statusItem}>
                      <Ionicons name="cash" size={16} color="#22c55e" />
                      <Text style={styles.info}>Detalles</Text>
                    </View>
                    <View style={styles.statusItem}>
                      <Ionicons name="cube" size={16} color="#3b82f6" />
                      <Text style={styles.info}>{p.entregas?.fecha_entrega ? 'Entregado' : 'Pendiente'}</Text>
                    </View>
                    <View style={styles.statusItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#eab308" />
                      <Text style={styles.info}>Creado</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleVerDetalles(p)}
                    style={styles.btnVerDetalles}
                  >
                    <Ionicons name="eye" size={16} color="#ffffff" />
                    <Text style={styles.botonTexto}>Ver detalles</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.botonesCard}>
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
                  {!pagado && (
                    <TouchableOpacity
                      onPress={() => handleAbonar(p.id)}
                      style={styles.btnAbonar}
                      disabled={cargando}
                    >
                      <Ionicons name="cash" size={16} color="#ffffff" />
                      <Text style={styles.botonTexto}>Abonar</Text>
                    </TouchableOpacity>
                  )}
                  {!p.entregas?.fecha_entrega && (
                    <TouchableOpacity
                      onPress={() => handleEntregar(p.id)}
                      style={styles.btnEntregar}
                      disabled={cargando}
                    >
                      <Ionicons name="cube" size={16} color="#ffffff" />
                      <Text style={styles.botonTexto}>Entregar</Text>
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
  btnImprimir: {
    backgroundColor: '#f59e0b',
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
  formulario: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  formTitulo: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
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
  lista: { flex: 1 },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardGrid: {
    marginBottom: 12,
  },
  nombre: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  info: { color: '#cbd5e1', fontSize: 14, marginTop: 4 },
  materialTags: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  materialTag: {
    backgroundColor: '#4b5563',
    color: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 12,
  },
  tipoMaterialTag: {
    backgroundColor: '#334155',
    color: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 12,
  },
  statusContainer: {
    marginTop: 8,
    gap: 4,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  botonesCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detallesContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
  },
  detallesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  subTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 4,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  textPagado: {
    color: '#22c55e',
  },
  textPendiente: {
    color: '#eab308',
  },
  table: {
    backgroundColor: '#334155',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4b5563',
    padding: 12,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
    padding: 12,
  },
  tableCell: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  statusTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    fontSize: 12,
    color: '#ffffff',
  },
  statusEntregado: {
    backgroundColor: '#22c55e',
  },
  statusPendiente: {
    backgroundColor: '#eab308',
  },
  financialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  financialCard: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    minWidth: '45%',
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
    paddingTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
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