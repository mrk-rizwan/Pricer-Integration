require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000; // Change this to your desired port
// Replace these with your actual credentials and URLs
const customerName = 'kakelgiganten';
const username = 'api';
const password = '#4rfv-5TGB#';
const storeUuid = 'kakelgiganten-reference-store';

app.get('/', async (req, res) => {
  return res.status(200).json({
    message: "All Working!"
  })
})
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
