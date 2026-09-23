const multer = require('multer');
const path = require('path');

// const uuid = require('uuid/v4');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: 'uploads/instructivos',
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

module.exports = multer({ storage });
