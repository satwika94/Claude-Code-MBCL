// Express 4 tidak otomatis menangkap Promise rejection dari async route
// handler — kalau di dalamnya ada `await db.query(...)` yang throw, request
// akan menggantung tanpa pernah kirim response, sampai platform hosting
// (mis. Vercel) timeout dan balikin 504 tanpa pesan error yang jelas.
// Wrapper ini meneruskan error itu ke `next(err)` supaya ditangani oleh
// error-handling middleware di src/app.js dan langsung dapat respons JSON.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
