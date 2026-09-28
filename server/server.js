const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');

const firestoreRoute = require('./routes/firestore');

dotenv.config({ path: './config/config.env' });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api', firestoreRoute);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'firestore' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server has started on port:${PORT}`);
  });
}

module.exports = app;