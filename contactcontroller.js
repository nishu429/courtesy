const db = require('../../models');
const { Validator } = require('node-input-validator');


module.exports = {
    getcontacts: async (req, res) => {
        try {
            const data = await db.contactus.findAll({
                order: [['id', 'DESC']],
            });
            res.render("contacts/contactlist.ejs", {
                title: "Contacts",
                data,
                session: req.session.admin,
            });
        } catch (error) {
            throw error
        }
    },
    deletecontact: async (req, res) => {
        try {
            if (!req.params.id) {
                return res.status(400).json({ success: false, message: "contact ID is required" });
            }
            const contact = await db.contactus.findByPk(req.params.id);
            if (!contact) {
                return res.status(404).json({ success: false, message: "contact not found" });
            }
            await db.contactus.destroy({ where: { id: req.params.id } });
            return res.json({ success: true, message: "contact deleted successfully" });
        } catch (error) {
            throw error
        }
    },
    contactview: async (req, res) => {
        try {
            const data = await db.contactus.findOne({
                where: { id: req.params.id }
            });
            res.render("contacts/contactview", {
                title: "Contact Detail",
                data,
                session: req.session.admin,
            });
        } catch (error) {
            throw error
        }
    },
}