const express = require("express");
const db = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());

// ================================
//   ROOT ROUTE (Health Check)
// ================================
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the CookIt API 🍳 (Now with MySQL!)",
    endpoints: {
      getAllRecipes: "GET /api/recipes",
      getOneRecipe: "GET /api/recipes/:id",
      searchByIngredient: "GET /api/recipes?ingredient=chicken",
      filterByCategory: "GET /api/recipes?category=dinner",
      addRecipe: "POST /api/recipes",
      updateRecipe: "PUT /api/recipes/:id",
      deleteRecipe: "DELETE /api/recipes/:id"
    }
  });
});

// ================================
//   GET /api/recipes
//   Supports ?ingredient= and ?category=
// ================================
app.get("/api/recipes", (req, res) => {
  const { category, ingredient } = req.query;
  let sql = "SELECT * FROM recipes";
  const params = [];

  if (category) {
    sql += " WHERE category = ?";
    params.push(category);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }

    let recipes = results.map((r) => ({
      ...r,
      ingredients: JSON.parse(r.ingredients),
      steps: JSON.parse(r.steps)
    }));

    if (ingredient) {
      recipes = recipes.filter((r) =>
        r.ingredients.some((ing) => ing.toLowerCase().includes(ingredient.toLowerCase()))
      );
    }

    res.status(200).json({
      success: true,
      count: recipes.length,
      data: recipes
    });
  });
});

// ================================
//   GET /api/recipes/:id
// ================================
app.get("/api/recipes/:id", (req, res) => {
  const id = req.params.id;

  db.query("SELECT * FROM recipes WHERE id = ?", [id], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: `Recipe with id ${id} not found` });
    }

    const recipe = {
      ...results[0],
      ingredients: JSON.parse(results[0].ingredients),
      steps: JSON.parse(results[0].steps)
    };

    res.status(200).json({ success: true, data: recipe });
  });
});

// ================================
//   POST /api/recipes  (CREATE)
// ================================
app.post("/api/recipes", (req, res) => {
  const { title, category, time, servings, ingredients, steps } = req.body;

  if (!title || !category || !ingredients || !steps) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: title, category, ingredients, steps"
    });
  }

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ success: false, message: "Ingredients must be a non-empty array" });
  }

  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ success: false, message: "Steps must be a non-empty array" });
  }

  const sql = `INSERT INTO recipes (title, category, time, servings, ingredients, steps) VALUES (?, ?, ?, ?, ?, ?)`;
  const values = [
    title,
    category,
    time || "N/A",
    servings || 1,
    JSON.stringify(ingredients),
    JSON.stringify(steps)
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }

    res.status(201).json({
      success: true,
      message: "Recipe created successfully",
      data: { id: result.insertId, title, category, time, servings, ingredients, steps }
    });
  });
});

// ================================
//   PUT /api/recipes/:id  (UPDATE)
// ================================
app.put("/api/recipes/:id", (req, res) => {
  const id = req.params.id;
  const { title, category, time, servings, ingredients, steps } = req.body;

  if (!title || !category || !ingredients || !steps) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: title, category, ingredients, steps"
    });
  }

  const sql = `UPDATE recipes SET title=?, category=?, time=?, servings=?, ingredients=?, steps=? WHERE id=?`;
  const values = [
    title,
    category,
    time || "N/A",
    servings || 1,
    JSON.stringify(ingredients),
    JSON.stringify(steps),
    id
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Recipe with id ${id} not found` });
    }

    res.status(200).json({
      success: true,
      message: "Recipe updated successfully",
      data: { id: parseInt(id), title, category, time, servings, ingredients, steps }
    });
  });
});

// ================================
//   DELETE /api/recipes/:id  (DELETE)
// ================================
app.delete("/api/recipes/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM recipes WHERE id = ?", [id], (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Recipe with id ${id} not found` });
    }

    res.status(200).json({
      success: true,
      message: `Recipe with id ${id} deleted successfully`
    });
  });
});

// ================================
//   404 HANDLER
// ================================
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ================================
//   START SERVER
// ================================
app.listen(PORT, () => {
  console.log(`🚀 CookIt API running on http://localhost:${PORT}`);
});