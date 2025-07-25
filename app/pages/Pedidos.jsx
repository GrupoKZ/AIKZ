  import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
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

  // Componente PedidoDetails
  function PedidoDetails({
    pedido,
    onVolver,
    vendedores,
    productos,
    cargando,
    resetDetalleForm,
    handleAñadirProducto,
    handleEliminarProducto,
    mostrarFormularioProducto,
    setMostrarFormularioProducto,
    detalleForm,
    handleDetalleChange,
    onEditarPedido,
    onEliminarPedido,
    onEntregar,
    onAbonar,
    inputTheme,
    productosSeleccionados,
    setProductosSeleccionados,
    onEditarProducto,
    handleCancelarEdicion,
    productoEditando,
    indexEditando,
  }) {
    const vendedor = pedido
      ? vendedores.find((v) => v.id === pedido.notas_venta?.clientes?.vendedores_id)
      : null;
    const pagado = pedido
      ? (pedido.notas_venta?.pago_pendiente || 0) <= 0
      : false;

    const subtotalTotal = productosSeleccionados.reduce((acc, p) => {
      const subtotalLimpio = (p.subtotal || '0').toString().replace(/[^0-9.-]+/g, '');
      return acc + (Number(subtotalLimpio) || 0);
    }, 0);

    const iva = subtotalTotal * 0.16;
    const total = subtotalTotal + iva - (pedido?.notas_venta?.descuento || 0);

    const fechaActual = new Date('2025-07-24T23:11:00-05:00');
    const fechaFormateada = fechaActual.toLocaleString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
      hour12: true,
    });

    const exportarPDF = async () => {
      try {
        const html = `
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                h1 { color: #333; text-align: center; margin-bottom: 30px; }
                .info { margin-bottom: 20px; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .total { font-weight: bold; margin-top: 20px; text-align: right; }
              </style>
            </head>
            <body>
              <h1>Comprobante de Pedido</h1>
              <div class="info">
                <div class="info-row">
                  <span><strong>ID:</strong> ${pedido?.id || 'N/A'}</span>
                  <span><strong>Fecha:</strong> ${pedido?.notas_venta?.fecha || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span><strong>Cliente:</strong> ${pedido?.notas_venta?.clientes?.nombre_contacto || 'N/A'}</span>
                  <span><strong>Vendedor:</strong> ${vendedor?.nombre || 'Sin asignar'}</span>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario (MX$)</th>
                    <th>Importe (MX$)</th>
                  </tr>
                </thead>
                <tbody>
                  ${productosSeleccionados
                    .map(
                      (producto) => `
                    <tr>
                      <td>${producto.nombre || 'N/A'}</td>
                      <td>${producto.cantidad || 0}</td>
                      <td>$${Number(producto.precio_unitario_con_iva.replace(/[^0-9.-]+/g, '') || 0).toLocaleString(
                        'es-MX',
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}</td>
                      <td>$${Number(producto.subtotal.replace(/[^0-9.-]+/g, '') || 0).toLocaleString('es-MX', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
              <div class="total">
                <p>Subtotal: $${subtotalTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p>IVA (16%): $${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p>Descuento: $${(pedido?.notas_venta?.descuento || 0).toLocaleString('es-MX', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</p>
                <p><strong>Total: $${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                <p>Pago pendiente: $${(pedido?.notas_venta?.pago_pendiente || 0).toLocaleString('es-MX', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</p>
                <p><small>Generado el: ${fechaFormateada}</small></p>
              </div>
            </body>
          </html>
        `;

        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
      } catch (error) {
        console.error('Error al exportar PDF:', error);
        Alert.alert('Error', 'No se pudo exportar el archivo PDF: ' + error.message);
      }
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Detalles del pedido</Text>
          <TouchableOpacity onPress={onVolver} style={styles.btnVolver}>
            <Text style={styles.botonTexto}>← Volver</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detallesContainer}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>{pedido?.notas_venta?.fecha || 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ID:</Text>
              <Text style={styles.infoValue}>{pedido?.id || 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Cliente:</Text>
              <Text style={styles.infoValue}>{pedido?.notas_venta?.clientes?.nombre_contacto || 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Vendedor:</Text>
              <Text style={styles.infoValue}>{vendedor?.nombre || 'Sin asignar'}</Text>
            </View>
          </View>

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

            {mostrarFormularioProducto && (
              <View style={styles.formularioProducto}>
                <Text style={[styles.subTitle, { marginBottom: 12 }]}>
                  {indexEditando !== null ? 'Editar Producto' : 'Agregar Producto'}
                </Text>

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
                    <Text style={styles.botonTexto}>{indexEditando !== null ? 'Actualizar' : 'Añadir'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnCancelarProducto} onPress={handleCancelarEdicion}>
                    <Text style={styles.botonTexto}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.tablaProductos}>
              <View style={styles.tablaHeader}>
                <Text style={[styles.tablaHeaderText, { flex: 3 }]}>Nombre</Text>
                <Text style={[styles.tablaHeaderText, { flex: 1 }]}>Cantidad</Text>
                <Text style={[styles.tablaHeaderText, { flex: 1 }]}>Precio Unit. (MX$)</Text>
                <Text style={[styles.tablaHeaderText, { flex: 1 }]}>Importe (MX$)</Text>
                <Text style={[styles.tablaHeaderText, { flex: 1 }]}>Estado</Text>
                <Text style={[styles.tablaHeaderText, { flex: 2 }]}>Acciones</Text>
              </View>

              {productosSeleccionados.map((producto, index) => (
                <View key={index} style={styles.tablaFila}>
                  <Text style={[styles.tablaCelda, { flex: 3, textAlign: 'left' }]}>{producto.nombre || 'N/A'}</Text>
                  <Text style={[styles.tablaCelda, { flex: 1 }]}>{producto.cantidad || 0}</Text>
                  <Text style={[styles.tablaCelda, { flex: 1 }]}>
                    ${Number(producto.precio_unitario_con_iva.replace(/[^0-9.-]+/g, '') || 0).toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={[styles.tablaCelda, { flex: 1 }]}>
                    ${Number(producto.subtotal.replace(/[^0-9.-]+/g, '') || 0).toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <View style={[styles.tablaCelda, { flex: 1, alignItems: 'center' }]}>
                    <View
                      style={[
                        styles.estatusPill,
                        index === 0 && pedido?.entregas?.length > 0 ? styles.estatusEntregado : styles.estatusPendiente,
                      ]}
                    >
                      <Text style={styles.estatusTexto}>
                        {index === 0 && pedido?.entregas?.length > 0 ? 'Entregado' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tablaCelda, { flex: 2, flexDirection: 'row', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }]}>
                    {/* Botón Editar Producto */}
                    <TouchableOpacity
                      style={styles.accionBtn}
                      onPress={() => onEditarProducto(producto, index)}
                    >
                      <Ionicons name="pencil" size={12} color="#6b7280" />
                    </TouchableOpacity>
                    
                    {/* Botón Eliminar Producto */}
                    <TouchableOpacity
                      style={styles.accionBtnEliminar}
                      onPress={() => handleEliminarProducto(index)}
                    >
                      <Ionicons name="trash" size={12} color="#ffffff" />
                    </TouchableOpacity>
                    
                    {/* Botón Editar Pedido Completo */}
                    <TouchableOpacity
                      style={styles.accionBtnEditar}
                      onPress={() => onEditarPedido(pedido)}
                    >
                      <Ionicons name="settings" size={12} color="#ffffff" />
                    </TouchableOpacity>
                    
                    {/* Botón Eliminar Pedido Completo */}
                    <TouchableOpacity
                      style={styles.accionBtnEliminarPedido}
                      onPress={() => onEliminarPedido(pedido.id)}
                    >
                      <Ionicons name="close-circle" size={12} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.resumenContainer}>
            <View style={styles.resumenIzquierda}>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Subtotal (MX$):</Text>
                <Text style={styles.resumenValor}>
                  ${subtotalTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.resumenFila}>
                <Text style={styles.ivaLabel}>IVA (16%) (MX$):</Text>
                <Text style={styles.ivaValor}>
                  ${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Descuento (MX$):</Text>
                <Text style={styles.resumenValor}>
                  ${(pedido?.notas_venta?.descuento || 0).toLocaleString('es-MX', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View style={styles.resumenFila}>
                <Text style={styles.totalLabel}>Total (MX$):</Text>
                <Text style={styles.totalValor}>
                  ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Pago pendiente (MX$):</Text>
                <Text style={[styles.resumenValor, { color: pagado ? '#22c55e' : '#ef4444' }]}>
                  ${(pedido?.notas_venta?.pago_pendiente || 0).toLocaleString('es-MX', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.resumenDerecha}>
              <View style={styles.estadoIndicadores}>
                <View style={styles.estadoFila}>
                  <View style={[styles.estadoBarra, { backgroundColor: pagado ? '#22c55e' : '#6b7280' }]} />
                  <Text style={styles.estadoTexto}>Depósitos</Text>
                </View>
                <View style={styles.estadoFila}>
                  <View style={[styles.estadoBarra, { backgroundColor: pedido?.entregas?.length > 0 ? '#3b82f6' : '#6b7280' }]} />
                  <Text style={styles.estadoTexto}>Entrega</Text>
                </View>
                <View style={styles.estadoFila}>
                  <View style={[styles.estadoBarra, { backgroundColor: '#eab308' }]} />
                  <Text style={styles.estadoTexto}>Crédito</Text>
                </View>
              </View>

              <View style={styles.botonesEstado}>
                <TouchableOpacity style={styles.btnAbonar} onPress={() => onAbonar(pedido.id)} disabled={cargando || pagado}>
                  <Text style={styles.btnEstadoTexto}>Abonar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btnEstado, pagado ? styles.btnPagado : styles.btnSinPagar]} disabled={true}>
                  <Text style={styles.btnEstadoTexto}>{pagado ? 'Pagado' : 'Sin pagar'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnEstado, pedido?.entregas?.length > 0 ? styles.btnEntregado : styles.btnPendiente]}
                  onPress={() => !pedido?.entregas?.length && onEntregar(pedido.id)}
                  disabled={cargando || pedido?.entregas?.length > 0}
                >
                  <Text style={styles.btnEstadoTexto}>{pedido?.entregas?.length > 0 ? 'Entregado' : 'Pendiente'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.imprimirContainer}>
            <TouchableOpacity style={styles.btnImprimir} onPress={exportarPDF} disabled={cargando}>
              {cargando ? (
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

  // Componente principal Pedidos
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
    const [productoEditando, setProductoEditando] = useState(null);
    const [indexEditando, setIndexEditando] = useState(null);
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

    // Definir resetDetalleForm antes de usarlo
    const resetDetalleForm = useCallback(() => {
      setDetalleForm({
        productos_id: '',
        cantidad: '',
      });
    }, []);

    // Definir handleEditarProducto y handleCancelarEdicion después de resetDetalleForm
    const handleEditarProducto = useCallback(
      (producto, index) => {
        setProductoEditando(producto);
        setIndexEditando(index);
        setDetalleForm({
          productos_id: producto.productos_id.toString(),
          cantidad: producto.cantidad.toString(),
        });
        setMostrarFormularioProducto(true);
      },
      []
    );

    // Función mejorada para cancelar edición
    const handleCancelarEdicion = useCallback(() => {
      try {
        setMostrarFormularioProducto(false);
        resetDetalleForm();
        setProductoEditando(null);
        setIndexEditando(null);
      } catch (error) {
        console.error('Error al cancelar edición:', error);
      }
    }, [resetDetalleForm]);

    useEffect(() => {
      fetchDatos();
    }, []);

    const fetchDatos = useCallback(async () => {
      await Promise.all([fetchPedidos(), fetchClientes(), fetchProductos(), fetchVendedores()]);
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
              fecha,
              clientes_id,
              subtotal,
              iva,
              total,
              descuento,
              clientes!inner(
                id,
                nombre_contacto,
                empresa,
                vendedores_id
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
          console.error('Error al obtener pedidos:', error);
          throw error;
        }

        const pedidosValidos = (data || []).filter((pedido) => {
          return pedido?.notas_venta?.clientes && pedido?.productos;
        });

        const pedidosConPagos = await Promise.all(
          pedidosValidos.map(async (pedido) => {
            try {
              const { data: pagosData, error: pagosError } = await supabase
                .from('pagos')
                .select('importe')
                .eq('notas_venta_id', pedido.notas_venta_id);

              if (pagosError) {
                console.warn('Error al obtener pagos para pedido:', pedido.id, pagosError);
              }

              const totalPagado = (pagosData || []).reduce((sum, pago) => sum + (pago.importe || 0), 0);
              const pagoPendiente = (pedido.notas_venta.total || 0) - totalPagado;

              return {
                ...pedido,
                notas_venta: {
                  ...pedido.notas_venta,
                  pago_pendiente: Math.max(pagoPendiente, 0),
                },
              };
            } catch (err) {
              console.warn('Error procesando pagos para pedido:', pedido.id, err);
              return {
                ...pedido,
                notas_venta: {
                  ...pedido.notas_venta,
                  pago_pendiente: pedido.notas_venta.total || 0,
                },
              };
            }
          })
        );

        setPedidos(pedidosConPagos);
      } catch (error) {
        console.error('Error en fetchPedidos:', error);
        Alert.alert('Error', 'Error al cargar pedidos: ' + (error.message || 'Error desconocido'));
      } finally {
        setCargando(false);
      }
    };

    const fetchClientes = async () => {
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('id, nombre_contacto, empresa, vendedores_id')
          .eq('estado', true)
          .order('nombre_contacto', { ascending: true });

        if (error) throw error;
        setClientes(data || []);
      } catch (error) {
        console.error('Error en fetchClientes:', error);
        Alert.alert('Error', 'Error al cargar clientes: ' + error.message);
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
        Alert.alert('Error', 'Error al cargar productos: ' + error.message);
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
        Alert.alert('Error', 'Error al cargar vendedores: ' + error.message);
      }
    };

    const pedidosFiltrados = pedidos.filter((p) => {
      if (!p?.productos || !p?.notas_venta?.clientes) return false;

      const searchTerms = [
        p.productos.nombre || '',
        p.notas_venta.clientes.nombre_contacto || '',
        p.notas_venta.clientes.empresa || '',
        p.id?.toString() || '',
      ].join(' ').toLowerCase();

      return searchTerms.includes(busqueda.toLowerCase());
    });

    const calculateSubtotal = useCallback(
      (cantidad, productos_id) => {
        const cantidadNum = Number(cantidad || '0');
        const producto = productos.find((p) => p.id === Number(productos_id || ''));

        if (!producto || cantidadNum <= 0) {
          return {
            precio_unitario_sin_iva: '0.00',
            precio_unitario_con_iva: '0.00',
            subtotal: '0.00',
          };
        }

        // Precios por kilo según material
        let precioPorKilo = 50; // Precio base por defecto
        const material = (producto.material || '').toUpperCase();

        if (material === 'CELOFAN') {
          precioPorKilo = 45;
        } else if (material === 'POLIETILENO') {
          precioPorKilo = 35;
        }

        let pesoKg = 0;
        let precioUnitario = 0;

        if (material === 'CELOFAN') {
          // Para celofán: calcular peso basado en dimensiones y micraje
          const largo = Number(producto.largo_cm || 0);
          const ancho = Number(producto.ancho_cm || 0);
          const micraje = Number(producto.micraje_um || 0);
          
          if (largo > 0 && ancho > 0 && micraje > 0) {
            // Fórmula corregida para celofán:
            // Área en m² * micraje en mm * densidad del celofán (1.42 g/cm³) * cantidad
            const areaM2 = (largo / 100) * (ancho / 100); // convertir cm a metros
            const micrajeEnMm = micraje / 1000; // convertir micrómetros a milímetros
            const densidadCelofan = 1.42; // g/cm³
            
            // Peso por unidad en kg
            const pesoPorUnidadKg = areaM2 * micrajeEnMm * 0.1 * densidadCelofan; // 0.1 para convertir a kg
            pesoKg = pesoPorUnidadKg * cantidadNum;
            precioUnitario = pesoPorUnidadKg * precioPorKilo;
          } else {
            // Si faltan dimensiones, usar precio base
            precioUnitario = precioPorKilo;
            pesoKg = cantidadNum;
          }
        } else if (material === 'POLIETILENO') {
          // Para polietileno: la cantidad ya viene en kg
          pesoKg = cantidadNum;
          precioUnitario = precioPorKilo; // precio por kg
        } else {
          // Para otros materiales: precio por unidad
          pesoKg = cantidadNum;
          precioUnitario = precioPorKilo;
        }

        // Calcular totales
        const subtotalSinIva = precioUnitario * cantidadNum;
        const subtotalConIva = aplicarIva ? subtotalSinIva * 1.16 : subtotalSinIva;

        return {
          precio_unitario_sin_iva: precioUnitario.toLocaleString('es-MX', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          }),
          precio_unitario_con_iva: (aplicarIva ? precioUnitario * 1.16 : precioUnitario).toLocaleString('es-MX', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          }),
          subtotal: subtotalConIva.toLocaleString('es-MX', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          }),
        };
      },
      [productos, aplicarIva]
    );

    const handleChange = useCallback((campo, valor) => {
      setForm((prev) => ({ ...prev, [campo]: valor }));
    }, []);

    const handleDetalleChange = useCallback((campo, valor) => {
      setDetalleForm((prev) => ({ ...prev, [campo]: valor }));
    }, []);

    const handleDateChange = useCallback(
      (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
          const formattedDate = selectedDate.toISOString().split('T')[0];
          handleChange('fecha', formattedDate);
        }
      },
      [handleChange]
    );

    // Función mejorada para resetear formulario
    const resetForm = useCallback(() => {
      try {
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
        setAplicarIva(true);
        setProductosSeleccionados([]);
        setMostrarFormulario(false);
        setMostrarFormularioProducto(false);
        resetDetalleForm();
        setProductoEditando(null);
        setIndexEditando(null);
      } catch (error) {
        console.error('Error al resetear formulario:', error);
      }
    }, [resetDetalleForm]);

    const handleGuardar = async () => {
      const { cliente_id, productos_id, cantidad, fecha, vendedor_id, id, abono, descuento } = form;

      if (!cliente_id || !fecha || !vendedor_id) {
        return Alert.alert('Campos requeridos', 'Cliente, fecha y vendedor son obligatorios.');
      }

      const cantidadNum = Number(cantidad) || 0;
      const abonoNum = Number(abono) || 0;
      const descuentoNum = Number(descuento) || 0;

      if (cantidadNum <= 0 && productosSeleccionados.length === 0) {
        return Alert.alert('Error', 'Debe agregar al menos un producto.');
      }

      if (abonoNum < 0 || descuentoNum < 0) {
        return Alert.alert('Error', 'El abono y el descuento no pueden ser negativos.');
      }

      try {
        setCargando(true);

        let subtotalTotal = 0;

        if (productosSeleccionados.length > 0) {
          subtotalTotal = productosSeleccionados.reduce((acc, p) => {
            const subtotalLimpio = p.subtotal.toString().replace(/[^0-9.-]+/g, '');
            return acc + Number(subtotalLimpio);
          }, 0);
        }

        if (productos_id && cantidadNum > 0) {
          const { subtotal } = calculateSubtotal(cantidad, productos_id);
          const subtotalLimpio = subtotal.replace(/[^0-9.-]+/g, '');
          subtotalTotal += Number(subtotalLimpio);
        }

        const ivaTotal = aplicarIva ? subtotalTotal * 0.16 : 0;
        const totalFinal = subtotalTotal + ivaTotal - descuentoNum;

        if (totalFinal <= 0) {
          return Alert.alert('Error', 'El total debe ser mayor a 0.');
        }

        const notaVentaData = {
          fecha,
          clientes_id: Number(cliente_id),
          subtotal: subtotalTotal,
          iva: ivaTotal,
          total: totalFinal,
          descuento: descuentoNum,
        };

        let notaVentaId;
        if (!id) {
          const { data: notaData, error: notaError } = await supabase
            .from('notas_venta')
            .insert([notaVentaData])
            .select('id')
            .single();

          if (notaError) throw notaError;
          notaVentaId = notaData.id;
        } else {
          notaVentaId = form.notas_venta_id;
          const { error: notaUpdateError } = await supabase
            .from('notas_venta')
            .update(notaVentaData)
            .eq('id', notaVentaId);

          if (notaUpdateError) throw notaUpdateError;
        }

        const cliente = clientes.find((c) => c.id === Number(cliente_id));
        if (cliente && cliente.vendedores_id !== Number(vendedor_id)) {
          const { error: clienteError } = await supabase
            .from('clientes')
            .update({ vendedores_id: Number(vendedor_id) })
            .eq('id', cliente_id);

          if (clienteError) {
            console.warn('Error al actualizar vendedor del cliente:', clienteError);
          }
        }

        const todosProductos = [];

        if (productosSeleccionados.length > 0) {
          productosSeleccionados.forEach((p) => {
            todosProductos.push({
              notas_venta_id: notaVentaId,
              productos_id: Number(p.productos_id),
              cantidad: Number(p.cantidad),
              precio_kilo_venta: Number(p.precio_unitario_sin_iva.replace(/[^0-9.-]+/g, '')),
              precio_unitario_venta: Number(p.precio_unitario_sin_iva.replace(/[^0-9.-]+/g, '')),
              precio_iva: Number(p.precio_unitario_con_iva.replace(/[^0-9.-]+/g, '')),
              importe: Number(p.subtotal.replace(/[^0-9.-]+/g, '')),
            });
          });
        }

        if (productos_id && cantidadNum > 0) {
          const { precio_unitario_sin_iva, precio_unitario_con_iva, subtotal } = calculateSubtotal(cantidad, productos_id);
          todosProductos.push({
            notas_venta_id: notaVentaId,
            productos_id: Number(productos_id),
            cantidad: cantidadNum,
            precio_kilo_venta: Number(precio_unitario_sin_iva.replace(/[^0-9.-]+/g, '')),
            precio_unitario_venta: Number(precio_unitario_sin_iva.replace(/[^0-9.-]+/g, '')),
            precio_iva: Number(precio_unitario_con_iva.replace(/[^0-9.-]+/g, '')),
            importe: Number(subtotal.replace(/[^0-9.-]+/g, '')),
          });
        }

        if (todosProductos.length > 0) {
          if (id) {
            const { error: pedidoError } = await supabase
              .from('pedidos')
              .update(todosProductos[0])
              .eq('id', id);

            if (pedidoError) throw pedidoError;
          } else {
            const { error: pedidosError } = await supabase
              .from('pedidos')
              .insert(todosProductos);

            if (pedidosError) throw pedidosError;
          }
        }

        if (abonoNum > 0) {
          const { error: pagoError } = await supabase
            .from('pagos')
            .insert([
              {
                notas_venta_id: notaVentaId,
                fecha: new Date().toISOString().split('T')[0],
                importe: abonoNum,
                metodo_pago: 'efectivo',
              },
            ]);

          if (pagoError) {
            console.warn('Error al registrar pago inicial:', pagoError);
          }
        }

        Alert.alert('Éxito', id ? 'Pedido actualizado correctamente' : 'Pedido creado correctamente');
        resetForm();
        await fetchPedidos();
      } catch (error) {
        console.error('Error en handleGuardar:', error);
        Alert.alert('Error', 'Error al guardar el pedido: ' + (error.message || 'Error desconocido'));
      } finally {
        setCargando(false);
      }
    };

    const handleEliminar = async (id) => {
      Alert.alert('Confirmar eliminación', '¿Estás seguro de que deseas eliminar este pedido?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);

              const { error: entregasError } = await supabase.from('entregas').delete().eq('pedidos_id', id);

              if (entregasError) {
                console.warn('Error al eliminar entregas:', entregasError);
              }

              const { error: pedidoError } = await supabase.from('pedidos').delete().eq('id', id);

              if (pedidoError) throw pedidoError;

              Alert.alert('Éxito', 'Pedido eliminado correctamente');
              await fetchPedidos();
            } catch (error) {
              console.error('Error al eliminar pedido:', error);
              Alert.alert('Error', 'Error al eliminar el pedido: ' + error.message);
            } finally {
              setCargando(false);
            }
          },
        },
      ]);
    };

    const handleEntregar = async (id) => {
      try {
        setCargando(true);
        const pedido = pedidos.find((p) => p.id === id);

        if (!pedido) {
          throw new Error('Pedido no encontrado');
        }

        const entregaData = {
          pedidos_id: id,
          cantidad: pedido.cantidad,
          unidades: 'millares',
          fecha_entrega: new Date().toISOString().split('T')[0],
        };

        const { error } = await supabase.from('entregas').upsert(entregaData, { onConflict: 'pedidos_id' });

        if (error) throw error;

        Alert.alert('Éxito', 'Pedido marcado como entregado');
        await fetchPedidos();
      } catch (error) {
        console.error('Error al entregar pedido:', error);
        Alert.alert('Error', 'Error al marcar como entregado: ' + error.message);
      } finally {
        setCargando(false);
      }
    };

    const handleAbonar = async (id) => {
      const pedido = pedidos.find((p) => p.id === id);

      if (!pedido?.notas_venta) {
        return Alert.alert('Error', 'No se pudo encontrar la información del pedido.');
      }

      const mostrarPrompt = () => {
        return new Promise((resolve) => {
          if (Platform.OS === 'web') {
            const resultado = window.prompt('Ingrese el monto del abono (MX$):', '');
            resolve(resultado);
          } else {
            if (Alert.prompt) {
              Alert.prompt(
                'Abono',
                'Ingrese el monto del abono (MX$):',
                [
                  { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
                  { text: 'OK', onPress: (text) => resolve(text) },
                ],
                'plain-text'
              );
            } else {
              Alert.alert('Error', 'Función no disponible en esta plataforma');
              resolve(null);
            }
          }
        });
      };

      try {
        const abonoStr = await mostrarPrompt();
        if (!abonoStr) return;

        const abonoNum = Number(abonoStr.replace(/[^0-9.-]+/g, '')) || 0;

        if (abonoNum <= 0) {
          return Alert.alert('Error', 'El abono debe ser mayor a 0.');
        }

        if (abonoNum > pedido.notas_venta.pago_pendiente) {
          return Alert.alert('Error', 'El abono no puede ser mayor al pago pendiente.');
        }

        setCargando(true);

        const { error: pagoError } = await supabase.from('pagos').insert([
          {
            notas_venta_id: pedido.notas_venta_id,
            fecha: new Date().toISOString().split('T')[0],
            importe: abonoNum,
            metodo_pago: 'efectivo',
          },
        ]);

        if (pagoError) throw pagoError;

        Alert.alert('Éxito', 'Abono registrado correctamente');
        await fetchPedidos();
      } catch (error) {
        console.error('Error en handleAbonar:', error);
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

      if (indexEditando !== null) {
        const productoExistente = productosSeleccionados.find(
          (p, idx) => Number(p.productos_id) === Number(productos_id) && idx !== indexEditando
        );

        if (productoExistente) {
          return Alert.alert('Error', 'Este producto ya está en la lista.');
        }

        const precios = calculateSubtotal(cantidad, productos_id);
        const producto = productos.find((p) => p.id === Number(productos_id));

        if (!producto) {
          return Alert.alert('Error', 'Producto no encontrado.');
        }

        const productoEditado = {
          productos_id: Number(productos_id),
          cantidad: Number(cantidad),
          precio_unitario_sin_iva: precios.precio_unitario_sin_iva,
          precio_unitario_con_iva: precios.precio_unitario_con_iva,
          subtotal: precios.subtotal,
          nombre: producto.nombre,
        };

        setProductosSeleccionados((prev) => {
          const nuevaLista = [...prev];
          nuevaLista[indexEditando] = productoEditado;
          return nuevaLista;
        });

        setProductoEditando(null);
        setIndexEditando(null);
      } else {
        const productoExistente = productosSeleccionados.find((p) => Number(p.productos_id) === Number(productos_id));

        if (productoExistente) {
          return Alert.alert('Error', 'Este producto ya está en la lista.');
        }

        const precios = calculateSubtotal(cantidad, productos_id);
        const producto = productos.find((p) => p.id === Number(productos_id));

        if (!producto) {
          return Alert.alert('Error', 'Producto no encontrado.');
        }

        const nuevoProducto = {
          productos_id: Number(productos_id),
          cantidad: Number(cantidad),
          precio_unitario_sin_iva: precios.precio_unitario_sin_iva,
          precio_unitario_con_iva: precios.precio_unitario_con_iva,
          subtotal: precios.subtotal,
          nombre: producto.nombre,
        };

        setProductosSeleccionados((prev) => [...prev, nuevoProducto]);
      }

      resetDetalleForm();
      setMostrarFormularioProducto(false);
    };

    const handleEliminarProducto = useCallback(
      (index) => {
        setProductosSeleccionados((prev) => prev.filter((_, i) => i !== index));
      },
      []
    );

    const exportarExcel = async () => {
      try {
        setCargandoExportar(true);
        if (pedidosFiltrados.length === 0) {
          Alert.alert('Sin datos', 'No hay pedidos para exportar.');
          return;
        }

        const datos = pedidosFiltrados.map((p) => {
          const vendedorPedido = vendedores.find((v) => v.id === p.notas_venta?.clientes?.vendedores_id);
          const pagado = (p.notas_venta?.pago_pendiente || 0) <= 0;

          return {
            ID: p.id || 'N/A',
            Fecha: p.notas_venta?.fecha || 'N/A',
            Cliente: `${p.notas_venta?.clientes?.nombre_contacto || 'N/A'} (${p.notas_venta?.clientes?.empresa || 'N/A'})`,
            Vendedor: vendedorPedido?.nombre || 'Sin asignar',
            Material: p.productos?.material || 'N/A',
            Producto: p.productos?.nombre || 'N/A',
            Cantidad: p.cantidad || 0,
            'Precio Unitario (MX$)': Number(p.precio_iva || 0).toLocaleString('es-MX', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            'Importe (MX$)': Number(p.importe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            'Pago Pendiente (MX$)': (p.notas_venta?.pago_pendiente || 0).toLocaleString('es-MX', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            'Estado Entrega': p.entregas?.length > 0 ? 'Entregado' : 'Pendiente',
            'Estado Pago': pagado ? 'Pagado' : 'Pendiente',
          };
        });

        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = FileSystem.cacheDirectory + 'pedidos_' + new Date().getTime() + '.xlsx';

        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await Sharing.shareAsync(uri);
      } catch (error) {
        console.error('Error al exportar Excel:', error);
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

        const fechaActual = new Date('2025-07-24T23:11:00-05:00');
        const fechaFormateada = fechaActual.toLocaleString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
          hour12: true,
        });

        let html = `
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                h1 { color: #333; text-align: center; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .total { font-weight: bold; margin-top: 20px; text-align: center; }
                .entregado { color: #22c55e; }
                .pendiente { color: #eab308; }
                .pagado { color: #22c55e; }
                .no-pagado { color: #ef4444; }
              </style>
            </head>
            <body>
              <h1>Lista de Pedidos (MXN)</h1>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio (MX$)</th>
                    <th>Importe (MX$)</th>
                    <th>Estado Entrega</th>
                    <th>Estado Pago</th>
                  </tr>
                </thead>
                <tbody>
        `;

        pedidosFiltrados.forEach((p) => {
          const vendedorPedido = vendedores.find((v) => v.id === p.notas_venta?.clientes?.vendedores_id);
          const pagado = (p.notas_venta?.pago_pendiente || 0) <= 0;
          const entregado = p.entregas?.length > 0;

          html += `
            <tr>
              <td>${p.id || 'N/A'}</td>
              <td>${p.notas_venta?.fecha || 'N/A'}</td>
              <td>${p.notas_venta?.clientes?.nombre_contacto || 'N/A'}</td>
              <td>${vendedorPedido?.nombre || 'Sin asignar'}</td>
              <td>${p.productos?.nombre || 'N/A'}</td>
              <td>${p.cantidad || 0}</td>
              <td>${(p.precio_iva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td>${(p.importe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="${entregado ? 'entregado' : 'pendiente'}">${entregado ? 'Entregado' : 'Pendiente'}</td>
              <td class="${pagado ? 'pagado' : 'no-pagado'}">${pagado ? 'Pagado' : 'Pendiente'}</td>
            </tr>
          `;
        });

        html += `
                </tbody>
              </table>
              <div class="total">
                <p>Total de pedidos: ${pedidosFiltrados.length}</p>
                <p>Fecha de generación: ${fechaFormateada}</p>
              </div>
            </body>
          </html>
        `;

        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
      } catch (error) {
        console.error('Error al exportar PDF:', error);
        Alert.alert('Error', 'No se pudo exportar el archivo PDF: ' + error.message);
      } finally {
        setCargandoExportar(false);
      }
    };

    const editarPedido = useCallback(
      (pedido) => {
        if (!pedido?.notas_venta?.clientes) {
          Alert.alert('Error', 'Información del pedido incompleta');
          return;
        }

        setForm({
          id: pedido.id,
          notas_venta_id: pedido.notas_venta_id,
          cliente_id: pedido.notas_venta.clientes.id?.toString() || '',
          productos_id: pedido.productos_id?.toString() || '',
          cantidad: pedido.cantidad?.toString() || '',
          fecha: pedido.notas_venta.fecha || new Date().toISOString().split('T')[0],
          folio: pedido.id?.toString() || '',
          vendedor_id: pedido.notas_venta.clientes.vendedores_id?.toString() || '',
          abono: '',
          descuento: pedido.notas_venta.descuento?.toString() || '0',
        });
        setAplicarIva((pedido.notas_venta.iva || 0) > 0);
        setMostrarFormulario(true);
        setMostrarDetalles(null);
      },
      []
    );

    const handleVerDetalles = useCallback(
      (pedido) => {
        if (!pedido?.productos || !pedido?.notas_venta) {
          Alert.alert('Error', 'Información del pedido incompleta');
          return;
        }

        setProductosSeleccionados([
          {
            productos_id: pedido.productos_id,
            cantidad: pedido.cantidad,
            precio_unitario_sin_iva: (pedido.precio_unitario_venta || 0).toString(),
            precio_unitario_con_iva: (pedido.precio_iva || 0).toString(),
            subtotal: (pedido.importe || 0).toString(),
            nombre: pedido.productos?.nombre,
          },
        ]);

        setMostrarDetalles(pedido);
      },
      []
    );

    // Función mejorada para volver
    const handleVolver = useCallback(() => {
      try {
        setMostrarDetalles(null);
        setMostrarFormularioProducto(false);
        setProductosSeleccionados([]);
        setProductoEditando(null);
        setIndexEditando(null);
        resetDetalleForm();
      } catch (error) {
        console.error('Error al volver:', error);
      }
    }, [resetDetalleForm]);

    const inputTheme = {
      colors: {
        primary: '#3b82f6',
        text: '#ffffff',
        placeholder: '#ccc',
        background: '#1e293b',
      },
    };

    if (mostrarDetalles) {
      return (
        <PedidoDetails
          pedido={mostrarDetalles}
          onVolver={handleVolver}
          vendedores={vendedores}
          productos={productos}
          cargando={cargando}
          resetDetalleForm={resetDetalleForm}
          handleAñadirProducto={handleAñadirProducto}
          handleEliminarProducto={handleEliminarProducto}
          mostrarFormularioProducto={mostrarFormularioProducto}
          setMostrarFormularioProducto={setMostrarFormularioProducto}
          detalleForm={detalleForm}
          handleDetalleChange={handleDetalleChange}
          onEditarPedido={editarPedido}
          onEliminarPedido={handleEliminar}
          onEntregar={handleEntregar}
          onAbonar={handleAbonar}
          inputTheme={inputTheme}
          productosSeleccionados={productosSeleccionados}
          setProductosSeleccionados={setProductosSeleccionados}
          onEditarProducto={handleEditarProducto}
          productoEditando={productoEditando}
          indexEditando={indexEditando}
          handleCancelarEdicion={handleCancelarEdicion}
        />
      );
    }

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
                  label="ID"
                  value={form.id?.toString() || 'Nuevo'}
                  mode="outlined"
                  style={styles.input}
                  theme={inputTheme}
                  textColor="#ffffff"
                  disabled={true}
                />
              </View>
              <View style={styles.col2}>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} disabled={cargando}>
                  <PaperInput
                    label="Fecha *"
                    value={form.fecha}
                    mode="outlined"
                    style={styles.input}
                    theme={inputTheme}
                    textColor="#ffffff"
                    editable={false}
                    right={<PaperInput.Icon icon="calendar" color="#ffffff" />}
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
                        value={c.id.toString()}
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
                      <Picker.Item key={v.id} label={v.nombre} value={v.id.toString()} />
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
                        <Picker.Item key={p.id} label={p.nombre} value={p.id.toString()} />
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
                    label="Abono inicial (MX$) (opcional)"
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
                <View style={styles.col2}>
                  <PaperInput
                    label="Descuento (MX$)"
                    value={form.descuento}
                    onChangeText={(text) => handleChange('descuento', text)}
                    mode="outlined"
                    style={styles.input}
                    keyboardType="numeric"
                    theme={inputTheme}
                    textColor="#ffffff"
                    disabled={cargando}
                  />
                </View>
              </View>

              <View style={styles.facturaRow}>
                <TouchableOpacity
                  style={[styles.checkbox, { backgroundColor: aplicarIva ? '#3b82f6' : 'transparent' }]}
                  onPress={() => setAplicarIva(!aplicarIva)}
                >
                  {aplicarIva && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                </TouchableOpacity>
                <Text style={styles.resumenLabel}>Aplicar IVA (16%)</Text>
              </View>

              {form.productos_id && form.cantidad && (
                <View style={styles.previewCalculos}>
                  <Text style={styles.subTitle}>Preview de cálculos</Text>
                  {(() => {
                    const calc = calculateSubtotal(form.cantidad, form.productos_id);
                    return (
                      <View style={styles.calculosGrid}>
                        <View style={styles.calculoItem}>
                          <Text style={styles.calculoLabel}>Precio sin IVA (MX$):</Text>
                          <Text style={styles.calculoValor}>${calc.precio_unitario_sin_iva}</Text>
                        </View>
                        <View style={styles.calculoItem}>
                          <Text style={styles.calculoLabel}>Precio con IVA (MX$):</Text>
                          <Text style={styles.calculoValor}>${calc.precio_unitario_con_iva}</Text>
                        </View>
                        <View style={styles.calculoItem}>
                          <Text style={styles.calculoLabel}>Subtotal (MX$):</Text>
                          <Text style={styles.calculoValor}>${calc.subtotal}</Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              )}
            </View>

            <View style={styles.botonesForm}>
              <TouchableOpacity style={[styles.btnGuardar, styles.btnSmall]} onPress={handleGuardar} disabled={cargando}>
                {cargando ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.botonTexto}>{form.id ? 'Actualizar' : 'Guardar'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnCancelarProducto, styles.btnSmall]} onPress={resetForm}>
                <Text style={styles.botonTexto}>Cancelar</Text>
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
            <Text style={styles.botonTexto}>+ Añadir pedido</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buscador}>
          <Ionicons name="search" size={20} color="#ffffff" />
          <TextInput
            placeholder="Buscar por ID, producto o cliente"
            placeholderTextColor="#cccccc"
            style={styles.inputText}
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        <View style={styles.botoneraDerecha}>
          <TouchableOpacity onPress={exportarExcel} style={styles.btnExportarExcel} disabled={cargandoExportar}>
            {cargandoExportar ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="download" size={16} color="#ffffff" />
                <Text style={styles.botonTexto}>Excel</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={exportarPDF} style={styles.btnExportarPDF} disabled={cargandoExportar}>
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
              const vendedorPedido = vendedores.find((v) => v.id === p.notas_venta.clientes.vendedores_id);
              const pagadoPedido = p.notas_venta.pago_pendiente <= 0;

              return (
                <View key={p.id} style={styles.card}>
                  <View style={styles.cardGrid}>
                    <View style={styles.infoCompleta}>
                      <Text style={styles.nombre}>Folio: {p.id}</Text>
                      <Text style={styles.info}>Cliente: {p.notas_venta.clientes.nombre_contacto}</Text>
                      <Text style={styles.info}>Producto: {p.productos.nombre}</Text>

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

                      {/* Información de precios */}
                      <View style={styles.preciosInfo}>
                        <View style={styles.precioRow}>
                          <Text style={styles.precioLabel}>Cantidad:</Text>
                          <Text style={styles.precioValor}>{p.cantidad || 0}</Text>
                        </View>
                        <View style={styles.precioRow}>
                          <Text style={styles.precioLabel}>Precio Unit.:</Text>
                          <Text style={styles.precioValor}>
                            ${Number(p.precio_iva || 0).toLocaleString('es-MX', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                        </View>
                        <View style={styles.precioRow}>
                          <Text style={styles.precioLabel}>Importe:</Text>
                          <Text style={styles.precioValorDestacado}>
                            ${Number(p.importe || 0).toLocaleString('es-MX', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                        </View>
                        <View style={styles.precioRow}>
                          <Text style={styles.precioLabel}>Pendiente:</Text>
                          <Text style={[styles.precioValor, { color: pagadoPedido ? '#22c55e' : '#ef4444' }]}>
                            ${Number(p.notas_venta.pago_pendiente || 0).toLocaleString('es-MX', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.statusIndicators}>
                      <View style={styles.statusRow}>
                        <View style={[styles.statusBar, { backgroundColor: pagadoPedido ? '#22c55e' : '#e5e7eb' }]} />
                        <Text style={styles.statusLabel}>Depósitos</Text>
                      </View>
                      <View style={styles.statusRow}>
                        <View style={[styles.statusBar, { backgroundColor: p.entregas?.fecha_entrega ? '#3b82f6' : '#e5e7eb' }]} />
                        <Text style={styles.statusLabel}>Entrega</Text>
                      </View>
                      <View style={styles.statusRow}>
                        <View style={[styles.statusBar, { backgroundColor: '#eab308' }]} />
                        <Text style={styles.statusLabel}>Crédito</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.botonesCard}>
                    <TouchableOpacity onPress={() => handleVerDetalles(p)} style={styles.btnVerDetalles}>
                      <Ionicons name="eye" size={16} color="#ffffff" />
                      <Text style={styles.botonTexto}>Ver detalles</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => editarPedido(p)} style={styles.btnEditar} disabled={cargando}>
                      <Ionicons name="pencil" size={16} color="#ffffff" />
                      <Text style={styles.botonTexto}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleEliminar(p.id)} style={styles.btnEliminar} disabled={cargando}>
                      <Ionicons name="trash" size={16} color="#ffffff" />
                      <Text style={styles.botonTexto}>Eliminar</Text>
                    </TouchableOpacity>

                    {!pagadoPedido && (
                      <TouchableOpacity onPress={() => handleAbonar(p.id)} style={styles.btnAbonar} disabled={cargando}>
                        <Ionicons name="cash" size={16} color="#ffffff" />
                        <Text style={styles.botonTexto}>Abonar</Text>
                      </TouchableOpacity>
                    )}

                    {!p.entregas?.fecha_entrega && (
                      <TouchableOpacity onPress={() => handleEntregar(p.id)} style={styles.btnEntregar} disabled={cargando}>
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
      marginBottom: 4,
    },
    info: {
      color: '#cbd5e1',
      fontSize: 14,
      marginTop: 4,
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
    preciosInfo: {
      marginTop: 12,
      backgroundColor: '#334155',
      borderRadius: 8,
      padding: 12,
    },
    precioRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    precioLabel: {
      fontSize: 12,
      color: '#cbd5e1',
      fontWeight: '500',
    },
    precioValor: {
      fontSize: 12,
      color: '#ffffff',
      fontWeight: 'bold',
    },
    precioValorDestacado: {
      fontSize: 12,
      color: '#3b82f6',
      fontWeight: 'bold',
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
    btnSmall: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    btnCancelarProducto: {
      backgroundColor: '#6b7280',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
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
      padding: 4,
      borderRadius: 4,
      backgroundColor: '#374151',
    },
    accionBtnEliminar: {
      padding: 4,
      borderRadius: 4,
      backgroundColor: '#ef4444',
    },
    accionBtnEditar: {
      padding: 4,
      borderRadius: 4,
      backgroundColor: '#eab308',
    },
    accionBtnEliminarPedido: {
      padding: 4,
      borderRadius: 4,
      backgroundColor: '#dc2626',
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
      flexDirection: 'row',
      justifyContent: 'space-between', // Mantener distribución en PedidoDetails
      marginTop: 16,
    },
    btnEstado: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    btnPagado: {
      backgroundColor: '#22c55e',
      borderColor: '#22c55e',
    },
    btnSinPagar: {
      backgroundColor: '#c54822ff',
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    btnEntregado: {
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
    },
    btnPendiente: {
        backgroundColor: '#c5c222ff',
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
      backgroundColor: '#2e558cff',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      
    },
    btnImprimirTexto: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
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
      justifyContent: 'center', // Centrar los botones
      gap: 16, // Espacio entre botones
      marginTop: 16,
    },
    btnGuardar: {
      backgroundColor: '#22c55e',
      paddingVertical: 6, // Reducir altura
      paddingHorizontal: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    btnCancelar: {
      backgroundColor: '#ef4444',
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    previewCalculos: {
      backgroundColor: '#4b5563',
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
    },
    calculosGrid: {
      gap: 8,
    },
    calculoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    calculoLabel: {
      color: '#cbd5e1',
      fontSize: 12,
    },
    calculoValor: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: 'bold',
    },
  });