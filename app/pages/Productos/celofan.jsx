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
import { supabase } from '../../../supabase';

  export default function Celofan() {
    // State management
    const [productos, setProductos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [cargandoExportar, setCargandoExportar] = useState(false);
    const [form, setForm] = useState({
      id: null,
      material: 'Celofan',
      presentacion: '',
      tipo: '',
      ancho_cm: '',
      largo_cm: '',
      valor: '', // Will hold either micraje or gramaje value
      nombre: '',
    });

    // Options for dropdowns
    const presentaciones = ['Micraje', 'Gramaje'];
    const micrajeTipos = ['Mordaza', 'Lateral', 'Pegol', 'Cenefa +Pegol'];
    const gramajeTipos = ['100gr C', '100gr L', '150gr', '250gr', '500gr', '1kg', '1.5kg', '2kg', '2.5kg', '3kg'];

    // Generate product name based on form data
    const generarNombre = (formData) => {
      const { presentacion, tipo, ancho_cm, largo_cm, valor } = formData;
      const anchoNum = Number(ancho_cm) || 0;
      const largoNum = Number(largo_cm) || 0;

      if (presentacion && tipo && valor) {
        if (presentacion === 'Gramaje' && anchoNum === 0 && largoNum === 0) {
          return `${formData.material} ${tipo} - Weight Based (${valor})`;
        } else if (presentacion === 'Micraje' && anchoNum > 0 && largoNum > 0) {
          const micrajeNum = Number(valor) || 0;
          return `${formData.material} ${tipo} ${anchoNum}x${largo_cm} (${micrajeNum})`;
        }
      }
      return formData.nombre || `${formData.material} ${presentacion || ''} ${tipo || ''}`;
    };

    // Fetch products on component mount
    useEffect(() => {
      fetchProductos();
    }, []);

    // Update form name when relevant fields change
    useEffect(() => {
      setForm((prev) => ({
        ...prev,
        nombre: generarNombre(prev),
      }));
    }, [form.presentacion, form.tipo, form.ancho_cm, form.largo_cm, form.valor]);

    // Fetch products from Supabase
    const fetchProductos = async () => {
      try {
        setCargando(true);
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .eq('material', 'Celofan')
          .order('nombre', { ascending: true });

        if (error) {
          Alert.alert('Error', 'No se pudieron cargar los productos de celofán');
          console.error('Error fetching productos:', error);
          return;
        }
        setProductos(data || []);
      } catch (error) {
        console.error('Error en fetchProductos:', error);
        Alert.alert('Error', 'Error inesperado al cargar productos');
      } finally {
        setCargando(false);
      }
    };

    // Filter products based on search
    const productosFiltrados = productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.tipo.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Handle form field changes
    const handleChange = (campo, valor) => {
      setForm((prev) => {
        const newForm = { ...prev, [campo]: valor };
        if (campo === 'presentacion') {
          newForm.tipo = ''; // Reset tipo when presentacion changes
          if (valor === 'Micraje') {
            newForm.valor = ''; // Reset valor when switching to Micraje
          } else if (valor === 'Gramaje') {
            newForm.valor = ''; // Reset valor when switching to Gramaje
          }
        }
        return {
          ...newForm,
          nombre: generarNombre(newForm),
        };
      });
    };

    // Reset form to initial state
    const resetForm = () => {
      setForm({
        id: null,
        material: 'Celofan',
        presentacion: '',
        tipo: '',
        ancho_cm: '',
        largo_cm: '',
        valor: '',
        nombre: '',
      });
      setMostrarFormulario(false);
    };

    // Save or update product
    const handleGuardar = async () => {
      const { nombre, presentacion, tipo, ancho_cm, largo_cm, valor, id } = form;

      if (!nombre.trim() || !presentacion || !tipo || !valor) {
        return Alert.alert('Campos requeridos', 'Nombre, presentación, tipo y valor son obligatorios.');
      }

      const anchoNum = Number(ancho_cm) || null;
      const largoNum = Number(largo_cm) || null;
      let micrajeNum = null;
      let gramajeValue = null;

      if (presentacion === 'Micraje') {
        micrajeNum = Number(valor);
        if (isNaN(micrajeNum) || micrajeNum <= 0) {
          return Alert.alert('Error', 'El micraje debe ser un número mayor a 0.');
        }
      } else if (presentacion === 'Gramaje') {
        gramajeValue = valor;
        if (isNaN(Number(gramajeValue)) || Number(gramajeValue) <= 0) {
          return Alert.alert('Error', 'El gramaje debe ser un número mayor a 0.');
        }
      }

      if (anchoNum !== null && (isNaN(anchoNum) || anchoNum <= 0)) {
        return Alert.alert('Error', 'El ancho debe ser un número mayor a 0 o dejarlo en blanco.');
      }
      if (largoNum !== null && (isNaN(largoNum) || largoNum <= 0)) {
        return Alert.alert('Error', 'El largo debe ser un número mayor a 0 o dejarlo en blanco.');
      }

      try {
        setCargando(true);
        const dataEnviar = {
          material: 'Celofan',
          presentacion,
          tipo,
          ancho_cm: anchoNum,
          largo_cm: largoNum,
          micraje: presentacion === 'Micraje' ? micrajeNum : null,
          gramaje: presentacion === 'Gramaje' ? gramajeValue : null,
          nombre: nombre.trim(),
        };

        const { error } = id
          ? await supabase.from('productos').update(dataEnviar).eq('id', id)
          : await supabase.from('productos').insert([dataEnviar]);

        if (error) {
          Alert.alert('Error', 'No se pudo guardar el producto.');
          console.error('Error saving producto:', error);
          return;
        }
        Alert.alert('Éxito', id ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
        resetForm();
        fetchProductos();
      } catch (error) {
        console.error('Error en handleGuardar:', error);
        Alert.alert('Error', 'Error inesperado al guardar el producto.');
      } finally {
        setCargando(false);
      }
    };

    // Delete product
    const handleEliminar = async (id) => {
      Alert.alert(
        'Confirmar eliminación',
        '¿Estás seguro de que deseas eliminar este producto? Esto puede afectar pedidos o movimientos asociados.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                setCargando(true);
                const { error } = await supabase.from('productos').delete().eq('id', id);
                if (error) {
                  Alert.alert('Error', 'No se pudo eliminar el producto.');
                  console.error('Error deleting producto:', error);
                  return;
                }
                Alert.alert('Éxito', 'Producto eliminado correctamente');
                fetchProductos();
              } catch (error) {
                console.error('Error en handleEliminar:', error);
                Alert.alert('Error', 'Error inesperado al eliminar el producto.');
              } finally {
                setCargando(false);
              }
            },
          },
        ]
      );
    };

    // Export to Excel
    const exportarExcel = async () => {
      try {
        setCargandoExportar(true);
        if (productosFiltrados.length === 0) {
          Alert.alert('Sin datos', 'No hay productos de celofán para exportar.');
          return;
        }
        const datos = productosFiltrados.map((p) => ({
          Nombre: p.nombre,
          Presentación: p.presentacion,
          Tipo: p.tipo,
          'Ancho (cm)': p.ancho_cm || 'N/A',
          'Largo (cm)': p.largo_cm || 'N/A',
          'Micraje (µm)': p.micraje || 'N/A',
          'Gramaje': p.gramaje || 'N/A',
        }));
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Celofan');
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = FileSystem.cacheDirectory + 'celofan.xlsx';
        await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(uri);
      } catch (error) {
        console.error('Error exportando Excel:', error);
        Alert.alert('Error', 'No se pudo exportar el archivo Excel.');
      } finally {
        setCargandoExportar(false);
      }
    };

    // Export to PDF
    const exportarPDF = async () => {
      try {
        setCargandoExportar(true);
        if (productosFiltrados.length === 0) {
          Alert.alert('Sin datos', 'No hay productos de celofán para exportar.');
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
              <h1>Productos de Celofán</h1>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Presentación</th>
                    <th>Tipo</th>
                    <th>Ancho (cm)</th>
                    <th>Largo (cm)</th>
                    <th>Micraje (µm)</th>
                    <th>Gramaje</th>
                  </tr>
                </thead>
                <tbody>
        `;
        productosFiltrados.forEach((p) => {
          html += `
            <tr>
              <td>${p.nombre}</td>
              <td>${p.presentacion}</td>
              <td>${p.tipo}</td>
              <td>${p.ancho_cm || 'N/A'}</td>
              <td>${p.largo_cm || 'N/A'}</td>
              <td>${p.micraje || 'N/A'}</td>
              <td>${p.gramaje || 'N/A'}</td>
            </tr>
          `;
        });
        html += `
                </tbody>
              </table>
              <div class="total">Total de productos: ${productosFiltrados.length}</div>
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

    // Edit existing product
    const editarProducto = (producto) => {
      setForm({
        id: producto.id,
        material: 'Celofan',
        presentacion: producto.presentacion,
        tipo: producto.tipo,
        ancho_cm: producto.ancho_cm ? product.ancho_cm.toString() : '',
        largo_cm: producto.largo_cm ? producto.largo_cm.toString() : '',
        valor: product.micraje ? product.micraje.toString() : product.gramaje || '',
        nombre: product.nombre,
      });
      setMostrarFormulario(true);
    };

    // Input theme configuration
    const inputTheme = {
      colors: { primary: '#3b82f6', text: '#ffffff', placeholder: '#ccc' },
    };

    return (
      <View style={styles.container}>
        <Text style={styles.title}>📜 Productos de Celofán</Text>

        <View style={styles.buscador}>
          <Ionicons name="search" size={20} color="#ffffff" />
          <TextInput
            placeholder="Buscar por nombre o tipo"
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
            <Text style={styles.botonTexto}>➕ Agregar Producto</Text>
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
            <Text style={styles.formTitulo}>{form.id ? 'Editar Producto' : 'Nuevo Producto'}</Text>
            <View style={styles.row2}>
              <View style={styles.col2}>
                <PaperInput
                  label="Nombre *"
                  value={form.nombre}
                  editable={false}
                  mode="outlined"
                  style={styles.input}
                  theme={inputTheme}
                  textColor="#ffffff"
                  disabled={cargando}
                />
              </View>
              <View style={styles.col2}>
                <Text style={styles.label}>Presentación *</Text>
                <View style={styles.pickerContainer}>
                <Picker
    selectedValue={form.presentacion}
    onValueChange={(value) => handleChange('presentacion', value)}
    style={styles.picker}
    enabled={!cargando}
    dropdownIconColor="#ffffff"
    mode="dropdown" // <- esto ayuda mucho en Android
  >
    <Picker.Item label="Seleccionar presentación" value="" color="#ccc" />
    {presentaciones.map((p) => (
      <Picker.Item key={p} label={p} value={p} color="#ffffff" />
    ))}
  </Picker>


                </View>
              </View>
            </View>
            <View style={styles.row2}>
              <View style={styles.col2}>
                <Text style={styles.label}>Tipo *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.tipo}
                    onValueChange={(value) => handleChange('tipo', value)}
                    style={styles.picker}
                    enabled={!cargando}
                  >
                    <Picker.Item label="Seleccionar tipo" value="" color="#ffffff" />
                    {(form.presentacion === 'Micraje' ? micrajeTipos : form.presentacion === 'Gramaje' ? gramajeTipos : []).map((t) => (
                      <Picker.Item key={t} label={t} value={t} color="#ffffff" />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.col2}>
                <PaperInput
                  label="Ancho (cm)"
                  value={form.ancho_cm}
                  onChangeText={(text) => handleChange('ancho_cm', text)}
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
                  label="Largo (cm)"
                  value={form.largo_cm}
                  onChangeText={(text) => handleChange('largo_cm', text)}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                  theme={inputTheme}
                  textColor="#ffffff"
                  disabled={cargando}
                />
              </View>
              <View style={styles.col2}>
                <Text style={styles.label}>{form.presentacion === 'Micraje' ? 'Micraje (µm) *' : form.presentacion === 'Gramaje' ? 'Gramaje *' : ''}</Text>
                {form.presentacion === 'Micraje' ? (
                  <PaperInput
                    label="Micraje (µm) *"
                    value={form.valor}
                    onChangeText={(text) => handleChange('valor', text)}
                    mode="outlined"
                    style={styles.input}
                    keyboardType="numeric"
                    theme={inputTheme}
                    textColor="#ffffff"
                    placeholder="Ingrese micraje"
                    disabled={cargando || form.presentacion !== 'Micraje'}
                  />
                ) : form.presentacion === 'Gramaje' ? (
                  <PaperInput
                    label="Gramaje *"
                    value={form.valor}
                    onChangeText={(text) => handleChange('valor', text)}
                    mode="outlined"
                    style={styles.input}
                    keyboardType="numeric"
                    theme={inputTheme}
                    textColor="#ffffff"
                    disabled={cargando || form.presentacion !== 'Gramaje'}
                  />
                ) : null}
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
          {productosFiltrados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {busqueda ? 'No se encontraron productos con esa búsqueda' : 'No hay productos de celofán registrados'}
              </Text>
            </View>
          ) : (
            productosFiltrados.map((p) => (
              <View key={p.id} style={styles.card}>
                <Text style={styles.nombre}>{p.nombre}</Text>
                <Text style={styles.info}>📦 Presentación: {p.presentacion}</Text>
                <Text style={styles.info}>🎨 Tipo: {p.tipo}</Text>
                <Text style={styles.info}>📏 Ancho: {p.ancho_cm || 'N/A'} cm</Text>
                <Text style={styles.info}>📏 Largo: {p.largo_cm || 'N/A'} cm</Text>
                <Text style={styles.info}>📏 {p.micraje ? `Micraje: ${p.micraje} µm` : `Gramaje: ${p.gramaje || 'N/A'}`}</Text>
                <View style={styles.botonesCard}>
                  <TouchableOpacity
                    onPress={() => editarProducto(p)}
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
    info: { color: '#ffffff', marginTop: 4 },
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
    overflow: 'hidden', // <-- importante para Android
  },

  picker: {
    color: '#ffffff',
    height: 40,
    backgroundColor: '#1e293b',
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
      color: '#ffffff',
      fontSize: 16,
      textAlign: 'center',
    },
  });