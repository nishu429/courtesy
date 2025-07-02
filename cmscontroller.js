const db = require('../../models');

module.exports = {
    privacy: async (req, res) => {
        try {
            const privacy = await db.cms.findOne({
                where: { type: '1' },
            });
            res.render("cms/privacypolicy", {
                title: "Privacy Policy",
                session: req.session.admin,
                privacy,
            });
        } catch (error) {
            throw error
        }
    },
    privacy_update: async (req, res) => {
        try {
            let data = await db.cms.update(req.body, {
                where: {
                    type: '1',
                }, raw: true
            })
            req.flash("success", "Privacy Policy updated successfully");
            res.redirect(`back`);
        } catch (error) {
            throw error
        }
    },
    aboutus: async (req, res) => {
        try {
            const privacy = await db.cms.findOne({
                where: { type: "2" },
            });

            res.render("cms/aboutus", {
                title: "About Us",
                session: req.session.admin,
                privacy,
            });
        } catch (error) {
            throw error
        }
    },
    aboutusupdate: async (req, res) => {
        try {
            let data = await db.cms.update(req.body, {
                where: {
                    type: "2",
                }, raw: true,
            })
            req.flash("success", "About us updated successfully");
            res.redirect(`back`);
        } catch (error) {
            throw error
        }
    },
    term: async (req, res) => {
        try {
            const privacy = await db.cms.findOne({
                where: { type: '3' },
            });
            res.render("cms/terms&conditions", {
                title: "Terms & Conditions",
                session: req.session.admin,
                privacy,
            });
        } catch (error) {
            throw error
        }
    },
    terms: async (req, res) => {
        try {
            let data = await db.cms.update(req.body, {
                where: {
                    type: '3',
                }, raw: true
            })
            req.flash("success", "Terms and Conditions updated successfully");
            res.redirect(`back`);
        } catch (error) {
            throw error
        }
    },
}







