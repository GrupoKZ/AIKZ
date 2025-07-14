import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';
import { useEffect, useMemo, useState } from 'react'; // Added useEffect to import
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
import * as XLSX from 'xlsx';

// Constants
const pedidoTypes = ['Celofán', 'Polietileno'];
const presentacionesCelofan = ['Micraje', 'Gramaje'];
const presentacionesPolietileno = ['Bobina', 'Bolsa'];
const tipos = ['Mordaza', 'Lateral', 'Pegol', 'Cenefa + Pegol', 'Negra', 'Semi Natural', 'Virgen', 'Color','100gr C' , '100gr L', '150gr', '200gr','500gr','1kg','1.5kg','2kg','2.5kg','3kg'];
export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    id: null,
    material: 'Celofán',
    nombre: '',
    presentacion: 'Micraje',
    tipo: 'Mordaza',
    gramaje: '',
    micraje_um: '',
    ancho_cm: '',
    largo_cm: '',
  });

  const isCelofan = form.material === 'Celofán';
  const isPolietileno = form.material === 'Polietileno';

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      setCargando(true);
      console.log('Loading products from CSV...');
      const csvData = await loadFileData('productos_rows.csv');
      
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().replace(/^"|"$/g, ''),
        transform: (value, header) => {
          let cleaned = value.trim().replace(/^"|"$/g, '');
          if (['ancho_cm', 'largo_cm', 'micraje_um'].includes(header)) {
            return cleaned === '' || isNaN(parseFloat(cleaned)) ? null : parseFloat(cleaned);
          }
          return cleaned;
        },
        complete: (results) => {
          const cleanedData = results.data.filter(row => row.nombre && row.material);
          console.log('Products parsed:', cleanedData);
          setProductos(cleanedData);
        },
        error: (err) => {
          console.error('CSV parsing error:', err);
          throw new Error('Failed to parse CSV file');
        }
      });
    } catch (error) {
      console.error('Error fetching productos:', error);
      Alert.alert('Error', error.message || 'No se pudieron cargar los productos');
    } finally {
      setCargando(false);
    }
  };

  const productosFiltrados = useMemo(() => {
    return productos.filter(
      (p) =>
        (p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || false)
    );
  }, [productos, busqueda]);

  const handleChange = (campo, valor) => {
    if (['gramaje', 'micraje_um', 'ancho_cm', 'largo_cm'].includes(campo)) {
      if (valor === '' || /^\d*\.?\d*$/.test(valor)) {
        setForm((prev) => ({ ...prev, [campo]: valor }));
      }
    } else {
      setForm((prev) => ({ ...prev, [campo]: valor }));
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      material: 'Celofán',
      nombre: '',
      presentacion: 'Micraje',
      tipo: 'Mordaza',
      gramaje: '',
      micraje_um: '',
      ancho_cm: '',
      largo_cm: '',
    });
    setMostrarFormulario(false);
  };

  const validarFormulario = () => {
    const errores = [];

    if (!form.nombre.trim()) errores.push('El nombre es requerido');
    if (!form.presentacion) errores.push('La presentación es requerida');
    if (!form.tipo) errores.push('El tipo es requerido');

    const numericFields = [
      { key: 'gramaje', label: 'Gramaje', required: isCelofan && form.presentacion === 'Gramaje' },
      { key: 'micraje_um', label: 'Micraje', required: (isCelofan && form.presentacion === 'Micraje') || isPolietileno },
      { key: 'ancho_cm', label: 'Ancho', required: false },
      { key: 'largo_cm', label: 'Largo', required: false },
    ];

    numericFields.forEach(({ key, label, required }) => {
      if (required && !form[key]) {
        errores.push(`${label} es requerido`);
      } else if (form[key] && form[key].trim() !== '' && isNaN(parseFloat(form[key]))) {
        errores.push(`${label} debe ser un número válido`);
      }
    });

    return errores;
  };

  const handleGuardar = async () => {
    const errores = validarFormulario();
    if (errores.length > 0) {
      Alert.alert('Error de validación', errores.join('\n'));
      return;
    }

    try {
      setCargando(true);
      const newProduct = {
        id: form.id || (productos.length > 0 ? Math.max(...productos.map(p => parseInt(p.id))) + 1 : 1),
        material: form.material,
        nombre: form.nombre,
        presentacion: form.presentacion,
        tipo: form.tipo,
        gramaje: form.gramaje ? parseFloat(form.gramaje) : null,
        micraje_um: form.micraje_um ? parseFloat(form.micraje_um) : null,
        ancho_cm: form.ancho_cm ? parseFloat(form.ancho_cm) : null,
        largo_cm: form.largo_cm ? parseFloat(form.largo_cm) : null,
      };

      if (form.id) {
        setProductos(productos.map(p => p.id === form.id ? newProduct : p));
      } else {
        setProductos([...productos, newProduct]);
      }

      resetForm();
      Alert.alert('Éxito', `Producto ${form.id ? 'actualizado' : 'guardado'} correctamente`);
    } catch (error) {
      console.error('Error saving producto:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el producto');
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = (producto) => {
    setForm({
      ...producto,
      gramaje: producto.gramaje ? producto.gramaje.toString() : '',
      micraje_um: producto.micraje_um ? producto.micraje_um.toString() : '',
      ancho_cm: producto.ancho_cm ? producto.ancho_cm.toString() : '',
      largo_cm: producto.largo_cm ? producto.largo_cm.toString() : '',
    });
    setMostrarFormulario(true);
  };

  const handleEliminar = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              setProductos(productos.filter(p => p.id !== id));
              Alert.alert('Éxito', 'Producto eliminado correctamente');
            } catch (error) {
              console.error('Error deleting producto:', error);
              Alert.alert('Error', error.message || 'No se pudo eliminar el producto');
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
      if (productosFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay productos para exportar');
        return;
      }

      setCargando(true);
      const datos = productosFiltrados.map(({ id, ...rest }) => ({
        ...rest,
        dimensiones: `${rest.ancho_cm || 0}cm x ${rest.largo_cm || 0}cm`,
        especificaciones: renderProductInfo(rest) || '-',
      }));
      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');

      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + 'productos.xlsx';
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      Alert.alert('Error', 'No se pudo exportar a Excel');
    } finally {
      setCargando(false);
    }
  };

  const exportarPDF = async () => {
    try {
      if (productosFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay productos para exportar');
        return;
      }

      setCargando(true);
      let html = `
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              tr:nth-child(even) { background-color: #f9f9f9; }
            </style>
          </head>
          <body>
            <h1>Lista de Productos</h1>
            <table>
              <tr>
                <th>Nombre</th>
                <th>Material</th>
                <th>Presentación</th>
                <th>Tipo</th>
                <th>Dimensiones</th>
                <th>Especificaciones</th>
              </tr>
      `;

      productosFiltrados.forEach((p) => {
        const dimensiones = `${p.ancho_cm || 0}cm x ${p.largo_cm || 0}cm`;
        const especificaciones = renderProductInfo(p) || '-';
        html += `
          <tr>
            <td>${p.nombre || ''}</td>
            <td>${p.material || ''}</td>
            <td>${p.presentacion || ''}</td>
            <td>${p.tipo || ''}</td>
            <td>${dimensiones}</td>
            <td>${especificaciones}</td>
          </tr>
        `;
      });

      html += `
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Error', 'No se pudo exportar a PDF');
    } finally {
      setCargando(false);
    }
  };

  const renderProductInfo = (producto) => {
    const { material, gramaje, micraje_um } = producto;

    if (material === 'Celofán') {
      const specs = [];
      if (gramaje) specs.push(`${gramaje}g`);
      if (micraje_um) specs.push(`${micraje_um}um`);
      return specs.length > 0 ? specs.join(' - ') : null;
    } else if (material === 'Polietileno' && micraje_um) {
      return `${micraje_um}um`;
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 Lista de Productos</Text>

      <View style={styles.buscador}>
        <Ionicons name="search" size={20} color="#ccc" />
        <TextInput
          placeholder="Buscar por nombre"
          placeholderTextColor="#ccc"
          style={styles.inputBuscar}
          value={busqueda}
          onChangeText={setBusqueda}
          accessible
          accessibilityLabel="Buscar productos por nombre"
        />
      </View>

      <View style={styles.botoneraDerecha}>
        <TouchableOpacity
          style={[styles.botonAgregar, cargando && styles.disabledButton]}
          onPress={() => setMostrarFormulario(true)}
          disabled={cargando}
        >
          <Text style={styles.botonTexto}>➕ Agregar Producto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnExportarExcel, cargando && styles.disabledButton]}
          onPress={exportarExcel}
          disabled={cargando}
        >
          <Text style={styles.botonTexto}>📊 Excel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnExportarPDF, cargando && styles.disabledButton]}
          onPress={exportarPDF}
          disabled={cargando}
        >
          <Text style={styles.botonTexto}>📄 PDF</Text>
        </TouchableOpacity>
      </View>

      {mostrarFormulario && (
        <View style={styles.formulario}>
          <Text style={styles.formTitulo}>
            {form.id ? 'Editar Producto' : 'Nuevo Producto'}
          </Text>

          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Material *:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.material}
                onValueChange={(val) => handleChange('material', val)}
                style={styles.picker}
                dropdownIconColor="#fff"
                accessible
                accessibilityLabel="Seleccionar material del producto"
              >
                {pedidoTypes.map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>
          </View>

          <TextInput
            placeholder="Nombre *"
            style={styles.input}
            placeholderTextColor="#ccc"
            value={form.nombre}
            onChangeText={(text) => handleChange('nombre', text)}
            accessible
            accessibilityLabel="Nombre del producto"
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Presentación *:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.presentacion}
                onValueChange={(val) => handleChange('presentacion', val)}
                style={styles.picker}
                dropdownIconColor="#fff"
                accessible
                accessibilityLabel="Seleccionar presentación del producto"
              >
                {(isCelofan ? presentacionesCelofan : presentacionesPolietileno).map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Tipo *:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.tipo}
                onValueChange={(val) => handleChange('tipo', val)}
                style={styles.picker}
                dropdownIconColor="#fff"
                accessible
                accessibilityLabel="Seleccionar tipo de producto"
              >
                {tipos.map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>
          </View>

          {isCelofan && (
            <>
              {form.presentacion === 'Gramaje' && (
                <TextInput
                  placeholder="Gramaje (g)"
                  style={styles.input}
                  placeholderTextColor="#ccc"
                  keyboardType="numeric"
                  value={form.gramaje}
                  onChangeText={(text) => handleChange('gramaje', text)}
                  accessible
                  accessibilityLabel="Gramaje del producto en gramos"
                />
              )}
              {form.presentacion === 'Micraje' && (
                <TextInput
                  placeholder="Micraje (um)"
                  style={styles.input}
                  placeholderTextColor="#ccc"
                  keyboardType="numeric"
                  value={form.micraje_um}
                  onChangeText={(text) => handleChange('micraje_um', text)}
                  accessible
                  accessibilityLabel="Micraje del producto en micrómetros"
                />
              )}
            </>
          )}

          {isPolietileno && (
            <TextInput
              placeholder="Micraje (um)"
              style={styles.input}
              placeholderTextColor="#ccc"
              keyboardType="numeric"
              value={form.micraje_um}
              onChangeText={(text) => handleChange('micraje_um', text)}
              accessible
              accessibilityLabel="Micraje del producto en micrómetros"
            />
          )}

          <View style={styles.row}>
            <TextInput
              placeholder="Ancho (cm)"
              style={[styles.input, styles.halfInput]}
              placeholderTextColor="#ccc"
              keyboardType="numeric"
              value={form.ancho_cm}
              onChangeText={(text) => handleChange('ancho_cm', text)}
              accessible
              accessibilityLabel="Ancho del producto en centímetros"
            />
            <TextInput
              placeholder="Largo (cm)"
              style={[styles.input, styles.halfInput]}
              placeholderTextColor="#ccc"
              keyboardType="numeric"
              value={form.largo_cm}
              onChangeText={(text) => handleChange('largo_cm', text)}
              accessible
              accessibilityLabel="Largo del producto en centímetros"
            />
          </View>

          <View style={styles.botonesForm}>
            <TouchableOpacity
              style={[styles.btnGuardar, cargando && styles.disabledButton]}
              onPress={handleGuardar}
              disabled={cargando}
            >
              <Text style={styles.botonTexto}>
                💾 {form.id ? 'Actualizar' : 'Guardar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnCancelar, cargando && styles.disabledButton]}
              onPress={resetForm}
              disabled={cargando}
            >
              <Text style={styles.botonTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {cargando && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      )}

      <ScrollView style={styles.lista}>
        {productosFiltrados.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {busqueda ? 'No se encontraron productos' : 'No hay productos registrados'}
            </Text>
          </View>
        ) : (
          productosFiltrados.map((p) => {
            const especificaciones = renderProductInfo(p);
            return (
              <View key={p.id} style={styles.card}>
                <Text style={styles.nombre}>{p.nombre}</Text>
                <Text style={styles.info}>📦 {p.material}</Text>
                <Text style={styles.info}>🎯 {p.presentacion} - {p.tipo}</Text>
                {p.ancho_cm && p.largo_cm && (
                  <Text style={styles.info}>📏 {p.ancho_cm}cm x {p.largo_cm}cm</Text>
                )}
                {especificaciones && <Text style={styles.info}>⚖️ {especificaciones}</Text>}
                <View style={styles.botonesCard}>
                  <TouchableOpacity
                    onPress={() => handleEditar(p)}
                    style={[styles.btnEditar, cargando && styles.disabledButton]}
                    disabled={cargando}
                    accessible
                    accessibilityLabel={`Editar producto ${p.nombre}`}
                  >
                    <Text style={styles.botonTexto}>✏️ Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleEliminar(p.id)}
                    style={[styles.btnEliminar, cargando && styles.disabledButton]}
                    disabled={cargando}
                    accessible
                    accessibilityLabel={`Eliminar producto ${p.nombre}`}
                  >
                    <Text style={styles.botonTexto}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  buscador: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  inputBuscar: {
    color: '#fff',
    flex: 1,
    paddingVertical: 10,
    marginLeft: 6,
  },
  input: {
    color: '#fff',
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  halfInput: {
    flex: 0.48,
    marginRight: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
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
  },
  btnExportarPDF: {
    backgroundColor: '#f59e0b',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
  formulario: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  formTitulo: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pickerContainer: {
    marginBottom: 10,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  pickerWrapper: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  picker: {
    color: '#fff',
    backgroundColor: '#1e293b',
  },
  botonesForm: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  btnGuardar: {
    backgroundColor: '#3b82f6',
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCancelar: {
    backgroundColor: '#ef4444',
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  loading: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  lista: { marginTop: 10 },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  nombre: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  info: { color: '#cbd5e1', marginTop: 4 },
  botonesCard: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  btnEditar: {
    backgroundColor: '#facc15',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnEliminar: {
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyState: {
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