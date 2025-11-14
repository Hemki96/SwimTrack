const express = require('express');
const { createNote } = require('../controllers/notes');

const router = express.Router();

router.post('/', createNote);

module.exports = router;
