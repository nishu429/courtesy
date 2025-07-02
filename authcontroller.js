const db = require('../../models');
const helper = require('../../helper/helper');
const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js');
db.users.hasOne(db.vehicles, {
  foreignKey: "user_id",
  as: "vehicle",
});
db.vehicles.belongsTo(db.users, {
  foreignKey: "user_id",
  as: "user",
});
module.exports = {
  dashboard: async (req, res) => {
    try {
      const users = await db.users.count({ where: { role: '1' } });
      const data = await db.vehicles.count({});
      const parking = await db.parkings.count({});
      const rating = await db.ratings.count({});
      const contact = await db.contactus.count({});

      const usersByMonth = await db.users.findAll({
        where: { role: '1' },
        attributes: [
          [db.Sequelize.fn('MONTH', db.Sequelize.col('createdAt')), 'month'],
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
        ],
        group: ['month'],
        order: [[db.Sequelize.fn('MONTH', db.Sequelize.col('createdAt')), 'ASC']],
        raw: true
      });
      const chartData = Array(12).fill(0);
      usersByMonth.forEach(item => {
        chartData[item.month - 1] = parseInt(item.count, 10);
      });
      res.render("dashboard", {
        session: req.session.admin,
        title: "Dashboard",
        chartData,
        users,
        data,
        parking,
        rating,
        contact,

      });
    } catch (error) {
      throw error
    }
  },
  login: async (req, res) => {
    try {
      res.render('admin/login');
    } catch (error) {
      req.flash("error", "Something went wrong, please try again");
      return res.redirect('/login');
    }
  },
  loginpost: async (req, res) => {
    try {
        const { email } = req.body;

        const find_user = await db.users.findOne({ where: { email, role: 0 } }); 
        if (!find_user) {
            req.flash("error", "Invalid Email");
            return res.redirect("/login");
        }
        if (!find_user.password) {
            req.flash("error", "Invalid Password");
            return res.redirect("/login");
        }
        var bytes = CryptoJS.AES.decrypt(find_user.password, 'secret key 443');
        var originalText = bytes.toString(CryptoJS.enc.Utf8);
        if (originalText !== req.body.password) {  
            req.flash("error", "Invalid Password");
            return res.redirect("/login");
        }
        req.session.admin = find_user;
        req.flash("success", "You are logged in successfully");
        return res.redirect("/dashboard");

    } catch (error) {
        console.error("Error:", error);
        req.flash("error", "Something went wrong, please try again");
        return res.redirect("/login");
    }
},
  profile: async (req, res) => {
    try {
      const profile = await db.users.findOne({
        where: { email: req.session.admin.email },
      });
      res.render("admin/profile.ejs", {
        session: req.session.admin,
        profile,
        title: "Profile"
      });
    } catch (error) {
      throw error
    }
  },
  edit_profile: async (req, res) => {
    try {
      let updatedata = { ...req.body };
      let folder = "admin";

      if (req.files && req.files.image) {
        let images = await helper.fileUpload(req.files.image, folder);
        updatedata.image = images;
      }
      if (req.body.phone) {
        updatedata.countrycode = req.body.countrycode;
      }

      await db.users.update(updatedata, {
        where: {
          id: req.session.admin.id,
        },
      });

      const find_data = await db.users.findOne({
        where: {
          id: req.session.admin.id,
        }, 
      });

      req.session.admin = find_data;
      req.flash("success", "Profile updated successfully");
      res.redirect("/dashboard");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  },

  password: async (req, res) => {
    try {
      res.render('admin/password',
        {
          session: req.session.admin,
          title: "Change Password"
        });
    } catch (error) {
      throw error
    }
  },
  updatepassword: async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    try {

      if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      if (newPassword !== confirmPassword) {
        req.flash("error", "New password and confirm password do not match");
        return res.status(400).json({ message: 'New password and confirm password do not match' });
      }
      const user = await db.users.findOne({ where: { id: req.session.admin.id } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        req.flash("error", "Old password is incorrect");
        return res.status(400).json({ message: 'Old password is incorrect' });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();
      req.session.admin.password = hashedPassword;
      req.flash("success", "Password updated successfully");
      res.redirect('/login');
    } catch (error) {
      console.error('Error updating password:', error);
      req.flash("error", "Server error");
      res.status(500).json({ message: 'Server error' });
    }
  },
  logout: async (req, res) => {
    try {
      req.session.destroy();
      res.redirect("/login");
    } catch (error) {
      throw error
    }
  },
  user_list: async (req, res) => {
    try {
      const data = await db.users.findAll({
        where: {
          role: "1",
        },
        order: [['id', 'DESC']], 
        raw: true,
      });
      res.render("admin/userlist", {
        title: "Users",
        data,
        session: req.session.admin,
      });
    } catch (error) {
      throw error;
    }
  },
  
  view: async (req, res) => {
    try {
      const view = await db.users.findOne({
        where: { id: req.params.id },
        include: [
          {
            model: db.vehicles,
            as: "vehicle",
            attributes: [
              "VehicleMake",
              "VehicleModel",
              "VehicleType",
              "VehicleColor",
              "VehicleNumber",
              "image",
            ],
          },
        ],
      });
      res.render("admin/userview.ejs", {
        session: req.session.admin,
        view,
        title: 'User Detail',
      });
    } catch (error) {
      throw error
    }
  },
  user_delete: async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await db.users.findByPk(userId);
      await db.users.destroy({ where: { id: userId } });
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      throw error
    }
  },
  user_status: async (req, res) => {
    try {
      const result = await db.users.update(
        { status: req.body.status },
        { where: { id: req.body.id } }
      );
      if (result[0] === 1) {
        res.json({ success: true });
      } else {
        res.json({ success: false, message: "Status change failed" });
      }
    } catch (error) {
      throw error
    }
  },
}