import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: "Grandma's Shop API is running!" });
});

// --- Raw Ingredients ---
app.get('/api/raw-ingredients', (req, res) => {
  db.all('SELECT * FROM RawIngredient ORDER BY expirationDate ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/raw-ingredients', (req, res) => {
  const { name, quantity, expirationDate } = req.body;
  db.run('INSERT INTO RawIngredient (name, quantity, expirationDate) VALUES (?, ?, ?)',
    [name, quantity, expirationDate],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, quantity, expirationDate });
    }
  );
});

app.delete('/api/raw-ingredients/:id', (req, res) => {
  db.run('DELETE FROM RawIngredient WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// --- Empty Jars ---
app.get('/api/empty-jars', (req, res) => {
  db.all('SELECT * FROM EmptyJar', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/empty-jars/update', (req, res) => {
  const { size, quantity } = req.body;
  db.run('UPDATE EmptyJar SET quantity = ? WHERE size = ?', [quantity, size], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// --- Canned Batches ---
app.get('/api/canned-batches', (req, res) => {
  db.all('SELECT * FROM CannedBatch ORDER BY dateCanned DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/canned-batches', (req, res) => {
  const { recipeName, quantity, jarSize, dateCanned, expirationDate } = req.body;
  
  db.serialize(() => {
    // 1. Decrement the empty jars
    db.run('UPDATE EmptyJar SET quantity = quantity - ? WHERE size = ?', [quantity, jarSize]);
    
    // 2. Insert the new batch
    db.run('INSERT INTO CannedBatch (recipeName, quantity, jarSize, dateCanned, expirationDate) VALUES (?, ?, ?, ?, ?)',
      [recipeName, quantity, jarSize, dateCanned, expirationDate],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, recipeName, quantity, jarSize, dateCanned, expirationDate });
      }
    );
  });
});

app.post('/api/canned-batches/:id/use', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT jarSize, quantity FROM CannedBatch WHERE id = ?', [id], (err, batch) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!batch || batch.quantity <= 0) return res.status(400).json({ error: "Batch empty or not found" });

    db.serialize(() => {
      // 1. Decrement batch quantity
      db.run('UPDATE CannedBatch SET quantity = quantity - 1 WHERE id = ?', [id]);
      
      // 2. Increment empty jar inventory
      db.run('UPDATE EmptyJar SET quantity = quantity + 1 WHERE size = ?', [batch.jarSize], function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        res.json({ success: true, message: "Jar used and empty jar returned to inventory" });
      });
    });
  });
});

app.delete('/api/canned-batches/:id', (req, res) => {
  db.run('DELETE FROM CannedBatch WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

// --- Recipes ---
app.get('/api/recipes', (req, res) => {
  db.all('SELECT * FROM Recipe ORDER BY title ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/recipes', (req, res) => {
  const { title, content, sourceUrl, imagePath } = req.body;
  db.run('INSERT INTO Recipe (title, content, sourceUrl, imagePath) VALUES (?, ?, ?, ?)',
    [title, content, sourceUrl, imagePath],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, title, content, sourceUrl, imagePath });
    }
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
