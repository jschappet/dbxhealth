var express = require('express');
var router = express.Router();

var controller = require('../controller');


/* GET home page. */
/*
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
*/
router.get('/', controller.home);
router.get('/login', controller.login);
router.get('/oauthredirect',controller.oauthredirect);

module.exports = router;
