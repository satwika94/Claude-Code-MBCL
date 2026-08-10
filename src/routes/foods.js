const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../middleware/asyncHandler");

module.exports = (db) => {
  /**
   * GET /api/foods?search=kata&category=sayur&diet=vegan&limit=20
   * Mengembalikan daftar bahan makanan, bisa difilter untuk pencarian cepat
   */
  router.get("/foods", asyncHandler(async (req, res) => {
    const { search, category, diet, limit } = req.query;
    let query = "SELECT * FROM foods WHERE 1=1";
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND name ILIKE $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (diet === "vegetarian") {
      query += " AND is_vegetarian = 1";
    } else if (diet === "vegan") {
      query += " AND is_vegan = 1";
    }
    query += " ORDER BY name";
    if (limit) {
      params.push(Number(limit));
      query += ` LIMIT $${params.length}`;
    }

    const { rows } = await db.query(query, params);
    res.json({ success: true, data: rows });
  }));

  return router;
};
