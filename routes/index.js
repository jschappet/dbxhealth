var express = require('express');
var router = express.Router();

var controller = require('../controller');


/* GET home page. */
/*
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
*/
router.get('/login', controller.login);
router.get('/', controller.home);
router.get('/oauthredirect',controller.oauthredirect);

router.get('/y/:year', controller.home);
module.exports = router;
