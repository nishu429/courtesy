var express = require("express");
const Relation = require("../helper/Relation");
const AuthController = require("../controller/Api/AuthController");
const helper = require("../helper/helper");
const UserController = require("../controller/Api/UserController");
const VehicleController = require("../controller/Api/VehicleController");
const CmsController = require("../controller/Api/CmsController");
const ContactusController = require("../controller/Api/ContactusController");
const ParkingController = require("../controller/Api/ParkingController");
const NotificationController = require("../controller/Api/NotificationController");
const parkingcontroller = require("../controller/admincontroller/parkingcontroller");
const BookingController = require("../controller/Api/BookingController");
const HomeController = require("../controller/Api/HomeController");
const RatingController = require("../controller/Api/RatingController");
// const { error405 } = require("../helper/helper");
Relation.dbrelation();
var router = express.Router();
/***************************AuthController*********************************** */
router.get("/testing", AuthController.testing);

router.post("/signup", AuthController.signup);
router.post("/signin", AuthController.signin);
router.post("/verifyotp", AuthController.verifyotp);
router.post("/otpresend", AuthController.otpresend);
router.post("/userexist", AuthController.userexist);
router.get("/cms", CmsController.cms);
router.get("/scheduler", BookingController.scheduler);

/***************************UserController*********************************** */
router.post("/forgotPassword", UserController.forgotPassword);
router.get("/resetPassword/:id/:ran_token", UserController.resetPassword);
router.post("/updateForgotPassword", UserController.updateForgotPassword);
router.get("/sucessmsg", UserController.sucessmsg);
router.get("/linkExpired", UserController.linkExpired);
router.post("/updatelocation", HomeController.updatelocation);
router.use(helper.authenticateJWT);
router.get("/getprofile", UserController.getprofile);
router.post("/userupdate", UserController.userupdate);
router.post("/deleteaccount", UserController.deleteaccount);
/***************************VehicleController*********************************** */
router.post("/addvehicle", VehicleController.addvehicle);
/***************************ContactusController*********************************** */
router.post("/addcontactus", ContactusController.addcontactus);
/***************************ParkingController*********************************** */
router.get("/parkinglist", ParkingController.parkinglist);
router.get("/parkingdetail", ParkingController.parkingdetail);
router.post("/addparking", ParkingController.addparking);
router.get("/history", ParkingController.history);
/***************************NotificationController*********************************** */
router.get("/notificationListing", NotificationController.notificationListing);
router.post( "/notification_readstatus",NotificationController.notification_readstatus);
router.post("/notificationStatus", NotificationController.notificationStatus);
/***************************BookingController*********************************** */
router.post("/addbooking", BookingController.addbooking);
router.post("/leavingspot_new", BookingController.leavingspot_new);
router.post("/vacantspot", BookingController.vacantspot);
router.post("/acceptwaiting", BookingController.acceptwaiting);
router.post("/arrivaltime", BookingController.arrivaltime);
router.post("/acceptReject", BookingController.acceptReject);
/***************************RatingController*********************************** */
router.post("/addrating", RatingController.addrating);
router.get("/ratinglist", RatingController.ratinglist);
/***************************HomeController*********************************** */
router.get("/homedetail", HomeController.homedetail);
router.post("/logout", AuthController.logout);

module.exports = router;
