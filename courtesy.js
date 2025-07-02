require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fileupload = require('express-fileupload');
const session = require('express-session');
const flash = require('express-flash');
const bcrypt = require('bcrypt');

var adminRouter = require('./routes/admin');
var apiroute = require("./routes/apiroute");

var app = express();
var http = require("http").createServer(app);  
var io = require("socket.io")(http); 
global.io = io; 
var PORT = process.env.PORT;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileupload());
app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: true,  
  cookie: { secure: false }
}));

app.use("/api", apiroute);
app.use('/', adminRouter);
require("./socket/socket")(io);

http.listen(PORT, () => {
  console.log(`Courtesy listening on port ${PORT}`);
});

module.exports = app;
