var express = require('express');
var router = express.Router();
const authcontroller = require('../controller/admincontroller/authcontroller');
 const checkadminsession = require('../helper/helper');
const cms = require('../controller/admincontroller/cmscontroller');
const contact = require('../controller/admincontroller/contactcontroller');
const vehicles = require('../controller/admincontroller/vehiclescontroller');
const parking = require('../controller/admincontroller/parkingcontroller');
const booking = require('../controller/admincontroller/bookingcontroller');
const rating = require('../controller/admincontroller/ratingcontroller');




//router for login 
router.get('/login', authcontroller.login);
router.post('/loginpost', authcontroller.loginpost);

// Use the middleware for all routes in the router
 router.use(checkadminsession.checkAdminSession);

// router for admin
router.get('/dashboard', authcontroller.dashboard);


//router for auth
router.get('/profile', authcontroller.profile);
router.post('/profileupdate', authcontroller.edit_profile);
router.get('/password', authcontroller.password);
router.post('/updatepassword', authcontroller.updatepassword);
router.get('/logout', authcontroller.logout);

//router for user
router.get('/userlist', authcontroller.user_list);
router.get('/view/:id', authcontroller.view);
router.post('/delete/:id', authcontroller.user_delete);
router.post('/status', authcontroller.user_status);
// router.get('/uservehicle/:id',authcontroller.view_user_vehicle);

//router for cms
router.get('/privacypolicy', cms.privacy);
router.post('/privacypolicy', cms.privacy_update);
router.get('/aboutus', cms.aboutus);
router.post('/aboutus', cms.aboutusupdate);
router.get('/term&conditions', cms.term);
router.post('/term&conditions', cms.terms);

// router for contact Us
router.get('/contacts', contact.getcontacts);
router.post('/deletecontact/:id', contact.deletecontact);
router.get('/viewcontact/:id', contact.contactview);


// router for vehicles
// router.get('/vehicleslist', vehicles.vehicleslist);
// router.post('/statuschange', vehicles.vehicle_status);
// router.post('/deletes/:id', vehicles.delete);
// router.get('/vehiclesview/:id', vehicles.vehiclesview);


//router for parking
router.post('/addparking', parking.addparking);
router.get('/parking', parking.parking);
router.get('/parkinglist', parking.parkinglist);
router.get('/viewparking/:id', parking.viewparking);
router.get('/parkingedit/:id', parking.parkingedit);
router.post('/updateparking/:id', parking.updateparking);
router.post('/statusparking', parking.parking_status);
router.post('/deleteparking/:id', parking.parking_delete);

// router for booking

router.get('/bookinglist', booking.getBooking);
router.post('/statusbooking', booking.booking_status);
router.post('/deletbooking/:id', booking.booking_delete);
router.get('/bookingview/:id', booking.bookingview);


// router for rating&reviews
router.get('/ratinglist',rating.rating_get);
router.get('/ratingview/:id', rating.ratingview);
router.post('/deletrating/:id', rating.rating_delete);





module.exports = router;
