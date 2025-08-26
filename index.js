require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const bankingRoutes = require('./routes/banking');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.use('/api/auth', authRoutes);
app.use('/api/bank', bankingRoutes);

app.get('/', (req, res) => {
  res.send('Banking API is running');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});