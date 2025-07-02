const path = require("path");
const uuid = require("uuid").v4;
const jwt = require("jsonwebtoken");
const db = require("../models");
const axios = require("axios");
const { google } = require("googleapis");
const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];
const push_projectName = "courtesy-802f3";
const serviceAccount = require("../helper/courtesy-802f3-firebase-adminsdk-fbsvc-afb46c9800.json");
const { log } = require("console");
const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  SCOPES,
  null
);
module.exports = {
  success: async (res, message = "", body = {}) => {
    return res.status(200).json({
      success: true,
      status: 200,
      message: message,
      body: body,
    });
  },
  error400: async (res, message = "", body = {}) => {
    return res.status(400).json({
      success: false,
      status: 400,
      message: message,
      body: body,
    });
  },
  error405: async (res, message = "Method Not Allowed", body = {}) => {
    return res.status(405).json({
      success: false,
      status: 405,
      message: message,
      body: body,
    });
  },
  error500: async (res, message = "", body = {}) => {
    return res.status(500).json({
      success: false,
      status: 500,
      message: message,
      body: body,
    });
  },
  fileUpload: async (file) => {
    if (!file) return null;
    const extension = path.extname(file.name);
    const filename = uuid() + extension;
    const filePath = path.join(process.cwd(), "public", "images", filename);
    try {
      await new Promise((resolve, reject) => {
        file.mv(filePath, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return `/images/${filename}`;
    } catch (error) {
      console.error("Error moving file:", error);
      throw new Error("Error uploading file");
    }
  },

  CheckValidation: async (validation) => {
    let errorsResponse = null;
    await validation.check().then(function (matched) {
      if (!matched) {
        const validationErrors = validation.errors;
        const respErrors = [];
        Object.keys(validationErrors).forEach(function (key) {
          if (validationErrors[key] && validationErrors[key].message) {
            respErrors.push(validationErrors[key].message);
          }
        });
        errorsResponse = respErrors.join(", ");
      }
    });
    return errorsResponse;
  },

  checkAdminSession: async (req, res, next) => {
    if (req.originalUrl === "/login" || req.originalUrl === "/loginpost") {
      return next();
    }
    if (!req.session.admin) {
      return res.redirect("/login");
    }
    next();
  },
  paginate: async (page, pageSize) => {
    const validPage = Math.max(parseInt(page, 10) || 1, 1);
    const validPageSize = Math.max(parseInt(pageSize, 10) || 10, 1);
    const offset = (validPage - 1) * validPageSize;
    return { limit: validPageSize, offset };
  },
  authenticateJWT: async (req, res, next) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
    }
  
    const token = authHeader.split(" ")[1];
  
    jwt.verify(token, process.env.secret_key, async (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: "Token invalid or expired",
        });
      }
  
      if (!user.login_time) {
        return res.status(401).json({
          success: false,
          message: "Invalid token: login_time missing",
        });
      }
  
      try {
        const userInfo = await db.users.findOne({
          where: { id: user.id, login_time: user.login_time },
        });
  
        if (!userInfo) {
          return res.status(401).json({
            success: false,
            message: "Please login first.",
          });
        }
  
        if (userInfo.status === 0) {
          return res.status(401).json({
            success: false,
            message: "User inactive.",
          });
        }
  
        req.user = user;
        next();
      } catch (dbError) {
        return res.status(500).json({
          success: false,
          message: "Database error",
          error: dbError.message,
        });
      }
    });
  },
  
  unixTimestamp: function () {
    var time = Date.now();
    var n = time / 1000;
    return (time = Math.floor(n));
  },
  // checkMethod: function (method) {
  //   return (req, res, next) => {
  //     if (req.method !== method.toUpperCase()) {
  //       return module.exports.error405(res, `Method ${req.method} not allowed`);
  //     }
  //     next();
  //   };
  // },

  // sendNotification: async (token, noti_data) => {
  //   try {
  //     jwtClient.authorize(async (err, tokens) => {
  //       if (err) {
  //         console.log("Error during JWT authorization:", err);
  //         return;
  //       }
  //       const accessToken = tokens.access_token;
  //       const apiUrl = `https://fcm.googleapis.com/v1/projects/${push_projectName}/messages:send`;
  //       const headers = {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${accessToken}`,
  //       };
  //       const data = {
  //         message: {
  //           token: token,
        
  //           notification: {
  //             title: "Courtesy ",
  //             body: noti_data.message,
  //           },
  //           data: {
  //             title: "Courtesy",
  //             body: noti_data.message,
  //             device_token: noti_data.device_token,
  //             device_type: JSON.stringify(noti_data.device_type),
  //             Receiver_name: noti_data.Receiver_name,
  //             Receiver_image: noti_data.Receiver_image,
  //             type: JSON.stringify(noti_data.type),
  //             senderId: JSON.stringify(noti_data.senderId),
  //             user2_Id: JSON.stringify(noti_data.user2_Id),
  //             sender_name: noti_data.sender_name,
  //             sender_image: noti_data.sender_image,
  //           },
  //         }
  //       };
  //       console.log(data,"push push");
        

  //       try {
  //         const response = await axios.post(apiUrl, data, { headers });
  //         console.log("Push sent successfully:", response.data);
  //         return true;
  //       } catch (error) {
  //         console.error("Error in sendNotification_android:", error);
  //         return false;
  //       }
  //     });
  //   } catch (error) {
  //     console.error("Error in sendNotification_android:", error);
  //     return false;
  //   }
  // },

  sendNotification: async (token, noti_data) => {
    try {
      jwtClient.authorize(async (err, tokens) => {
        if (err) {
          console.log("Error during JWT authorization:", err);
          return;
        }
        const accessToken = tokens.access_token;
        const apiUrl = `https://fcm.googleapis.com/v1/projects/${push_projectName}/messages:send`;
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        };
     
        const data = {
          message: {
            token: token,

            notification: {
              title: "Courtesy ",
              body: noti_data.message,
            },

            data: {
              title: "Courtesy",
              body: noti_data.message,
              deviceToken: noti_data.deviceToken,
              deviceType: JSON.stringify(noti_data.deviceType),
              Receiver_name: noti_data.Receiver_name,
              Receiver_image: noti_data.Receiver_image,
              type: JSON.stringify(noti_data.type),
              senderId: JSON.stringify(noti_data.senderId),
              receiver_id: JSON.stringify(noti_data.receiver_id),
              sender_name: noti_data.sender_name,
              sender_image: noti_data.sender_image,
              parkingName:noti_data. parkingName,
              parkingid:JSON.stringify(noti_data .parkingid),
              booking_id:JSON.stringify(noti_data .booking_id),
            },
          },
      
        };
       
        console.log(data,"Push push");
        try {
          const response = await axios.post(apiUrl, data, { headers });
          console.log("Push sent successfully:", response.data);
          return true;
        } catch (error) {
          return false;
        }
      });
    } catch (error) {
      return false;
    }
  },
};
