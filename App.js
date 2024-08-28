
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { messaging } from './firebase-config';
import { getToken } from 'firebase/messaging';

const App = () => {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    // Request location permission
    Geolocation.requestAuthorization();

    // Get current location
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
      },
      error => console.log('Error', error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );

    // Request push notification permission and get FCM token
    const getFCMToken = async () => {
      try {
        await messaging().requestPermission();
        const token = await getToken(messaging);
        console.log('FCM Token:', token);
        // TODO: Send this token to your server to associate with the user
      } catch (error) {
        console.log('Failed to get FCM token:', error);
      }
    };

    getFCMToken();

    // Listen for push notifications
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      Alert.alert('New Message', JSON.stringify(remoteMessage));
    });

    return unsubscribe;
  }, []);

  const sendSOS = async () => {
    if (!location) {
      Alert.alert('Error', 'Unable to get your location');
      return;
    }

    try {
      const response = await fetch('http://your-api-url/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'user-id-here', // Replace with actual user ID
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      if (response.ok) {
        Alert.alert('SOS Sent', 'Help is on the way!');
      } else {
        Alert.alert('Error', 'Failed to send SOS');
      }
    } catch (error) {
      console.error('Error sending SOS:', error);
      Alert.alert('Error', 'Failed to send SOS');
    }
  };

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          <Marker coordinate={location} />
        </MapView>
      )}
      <View style={styles.buttonContainer}>
        <Button title="SOS" onPress={sendSOS} color="red" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
});

export default App;
