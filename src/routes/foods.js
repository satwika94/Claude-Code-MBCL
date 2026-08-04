const express = require("express");
const router = express.Router();

module.exports = (db) => {
  /**
   * GET /api/foods?search=kata&category=sayur&diet=vegan&limit=20
   * Mengembalikan daftar bahan makanan, bisa difilter untuk pencarian cepat
   */
  router.get("/foods", (req, res) => {
    const { search, category, diet, limit } = req.query;
    let query = "SELECT * FROM foods WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND name LIKE ?";
      params.push(`%${search}%`);
    }
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    if (diet === "vegetarian") {
      query += " AND is_vegetarian = 1";
    } else if (diet === "vegan") {
      query += " AND is_vegan = 1";
    }
    query += " ORDER BY name";
    if (limit) {
      query += " LIMIT ?";
      params.push(Number(limit));
    }

    const foods = db.prepare(query).all(...params);
    res.json({ success: true, data: foods });
  });

  return router;
};
