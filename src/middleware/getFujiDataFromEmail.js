const Account = require("../models/account");

module.exports = () => {
    return async (req, res, next) => {
        try {
            const email = req.body.email
            const { fuji_person_id } = await Account.findOne({
                attributes: ['fuji_person_id'],
                where: { email: email }
            })
            res.locals.fujiData = { fuji_person_id }
            next()
            return
        } catch (error) {
            return res.status(500).json({ message: "根據email尋找會員失敗" })
        }
    }
}