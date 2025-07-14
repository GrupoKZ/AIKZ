// app/index.jsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Espera que el layout esté montado
    const timeout = setTimeout(() => {
      setIsReady(true);
    }, 10); // pequeño delay para asegurar montaje

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isReady) {
      router.replace('/pages/Login');
    }
  }, [isReady]);

  return <View><Text>Cargando...</Text></View>;
}
