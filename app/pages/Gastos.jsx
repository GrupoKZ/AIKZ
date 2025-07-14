// app/pages/Gastos.jsx
import { Ionicons } from '@expo/vector-icons';
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

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoExportar, setCargandoExportar] = useState(false);
  const [form, setForm] = useState({
    id: null,
    fecha: new Date().toISOString().split('T')[0], // Default to today
    concepto: '',
    importe: '0',
    categoria: '',
  });

  useEffect(() => {
    fetchGastos();
  }, []);

  const fetchGastos = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        Alert.alert('Error', 'No se pudieron cargar los gastos');
        console.error('Error fetching gastos:', error);
        return;
      }

      setGastos(data || []);
    } catch (error) {
      console.error('Error en fetchGastos:', error);
      Alert.alert('Error', 'Error inesperado al cargar gastos');
    } finally {
      setCargando(false);
    }
  };

  const gastosFiltrados = gastos.filter(
    (g) =>
      g.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
      g.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const resetForm = () => {
    setForm({
      id: null,
      fecha: new Date().toISOString().split('T')[0],
      concepto: '',
      importe: '0',
      categoria: '',
    });
    setMostrarFormulario(false);
  };

  const handleGuardar = async () => {
    const { fecha, concepto, importe, categoria, id } = form;

    if (!fecha || !concepto.trim()) {
      return Alert.alert('Campos requeridos', 'Fecha y concepto son obligatorios.');
    }

    const importeNum = Number(importe);
    if (isNaN(importeNum) || importeNum < 0) {
      return Alert.alert('Error', 'El importe debe ser un número válido mayor o igual a 0.');
    }

    try {
      setCargando(true);
      const dataEnviar = {
        fecha,
        concepto: concepto.trim(),
        importe: importeNum,
        categoria: categoria.trim() || null,
      };

      const { error } = id
        ? await supabase.from('gastos').update(dataEnviar).eq('id', id)
        : await supabase.from('gastos').insert([dataEnviar]);

      if (error) {
        Alert.alert('Error', 'No se pudo guardar el gasto.');
        console.error('Error saving gasto:', error);
        return;
      }

      Alert.alert('Éxito', id ? 'Gasto actualizado correctamente' : 'Gasto creado correctamente');
      resetForm();
      fetchGastos();
    } catch (error) {
      console.error('Error en handleGuardar:', error);
      Alert.alert('Error', 'Error inesperado al guardar el gasto.');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este gasto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setCargando(true);
              const { error } = await supabase.from('gastos').delete().eq('id', id);

              if (error) {
                Alert.alert('Error', 'No se pudo eliminar el gasto.');
                console.error('Error deleting gasto:', error);
                return;
              }

              Alert.alert('Éxito', 'Gasto eliminado correctamente');
              fetchGastos();
            } catch (error) {
              console.error('Error en handleEliminar:', error);
              Alert.alert('Error', 'Error inesperado al eliminar el gasto.');
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

      if (gastosFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay gastos para exportar.');
        return;
      }

      const datos = gastosFiltrados.map(({ id, fecha, concepto, importe, categoria }) => ({
        fecha,
        concepto,
        importe,
        categoria: categoria || 'Sin categoría',
      }));
      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Gastos');

      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + 'gastos.xlsx';

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

      if (gastosFiltrados.length === 0) {
        Alert.alert('Sin datos', 'No hay gastos para exportar.');
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
            <h1>Lista de Gastos</h1>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Importe</th>
                  <th>Categoría</th>
                </tr>
              </thead>
              <tbody>
      `;

      gastosFiltrados.forEach((g) => {
        html += `
          <tr>
            <td>${g.fecha}</td>
            <td>${g.concepto}</td>
            <td>${g.importe}</td>
            <td>${g.categoria || 'Sin categoría'}</td>
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
            <div class="total">Total de gastos: ${gastosFiltrados.length}</div>
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

  const editarGasto = (gasto) => {
    setForm({
      id: gasto.id,
      fecha: gasto.fecha,
      concepto: gasto.concepto,
      importe: gasto.importe.toString(),
      categoria: gasto.categoria || '',
    });
    setMostrarFormulario(true);
  };

  const inputTheme = {
    colors: { primary: '#3b82f6', text: '#fff', placeholder: '#ccc' },
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💸 Lista de Gastos</Text>

      <View style={styles.buscador}>
        <Ionicons name="search" size={20} color="#ccc" />
        <TextInput
          placeholder="Buscar por concepto o categoría"
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
          <Text style={styles.botonTexto}>➕ Agregar Gasto</Text>
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
          <Text style={styles.formTitulo}>{form.id ? 'Editar Gasto' : 'Nuevo Gasto'}</Text>

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
              <PaperInput
                label="Concepto *"
                value={form.concepto}
                onChangeText={(text) => handleChange('concepto', text)}
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
                label="Importe *"
                value={form.importe === '0' ? '' : form.importe}
                onChangeText={(text) => handleChange('importe', text)}
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
                label="Categoría"
                value={form.categoria}
                onChangeText={(text) => handleChange('categoria', text)}
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
        {gastosFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {busqueda ? 'No se encontraron gastos con esa búsqueda' : 'No hay gastos registrados'}
            </Text>
          </View>
        ) : (
          gastosFiltrados.map((g) => (
            <View key={g.id} style={styles.card}>
              <Text style={styles.nombre}>{g.concepto}</Text>
              <Text style={styles.info}>📅 {g.fecha}</Text>
              <Text style={styles.info}>💰 ${g.importe}</Text>
              {g.categoria && <Text style={styles.info}>🏷️ {g.categoria}</Text>}
              <View style={styles.botonesCard}>
                <TouchableOpacity
                  onPress={() => editarGasto(g)}
                  style={styles.btnEditar}
                  disabled={cargando}
                >
                  <Text style={styles.botonTexto}>✏️ EDITAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleEliminar(g.id)}
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