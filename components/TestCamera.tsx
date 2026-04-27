import { useCameraPermissions, CameraView } from 'expo-camera';
import { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';

export default function TestCamera() {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    console.log('Camera permission status:', permission);
  }, [permission]);

  if (!permission) {
    return <Text style={{ marginTop: 50, textAlign: 'center' }}>Checking camera...</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ marginBottom: 20 }}>Camera permission not granted</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <CameraView style={{ flex: 1 }} facing="back">
      <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Camera is working!</Text>
      </View>
    </CameraView>
  );
}
