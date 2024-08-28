
const express = require('express');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Firebase Admin SDK initialization
const serviceAccount = require('./path/to/your/firebase-adminsdk.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/womens_safety_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  emergencyContacts: [{ name: String, phone: String }],
  fcmToken: String
});

const User = mongoose.model('User', userSchema);

// PostgreSQL connection
const pool = new Pool({
  user: 'yourusername',
  host: 'localhost',
  database: 'womens_safety_app',
  password: 'yourpassword',
  port: 5432,
});

// Google Maps API key
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

// API endpoint to get user data
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).send(err);
  }
});

// API endpoint to get location data
app.get('/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err);
  }
});

// API endpoint for SOS
app.post('/sos', async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Save location to PostgreSQL
    await pool.query(
      'INSERT INTO sos_events (user_id, latitude, longitude, timestamp) VALUES ($1, $2, $3, $4)',
      [userId, latitude, longitude, new Date()]
    );

    // Get address from Google Maps API
    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
    const address = response.data.results[0].formatted_address;

    // Send notifications to emergency contacts
    for (const contact of user.emergencyContacts) {
      await admin.messaging().send({
        token: contact.fcmToken,
        notification: {
          title: 'SOS Alert',
          body: `${user.name} needs help! Location: ${address}`
        },
        data: {
          latitude: latitude.toString(),
          longitude: longitude.toString()
        }
      });
    }

    res.send('SOS alert sent successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing SOS alert');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
