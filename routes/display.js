var express = require('express');
var router = express.Router();

var controller = require('../controller');

/// ROUTE /d/*
router.get('/:year/:month', controller.display);
router.get('/:year', controller.display);

module.exports = router;
