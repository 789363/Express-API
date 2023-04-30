const Account = require("../models/account");

module.exports = () => {
    return async (req, res, next) => {
        try {
            const account_name = req.decoded.account_name
            const { account_id } = await Account.findOne({
                attributes: ['account_id'],
                where: { account_name: account_name }
            })

            req.account_id = account_id;
            next()
            return
        } catch (error) {
            return res.status(500).json({ message: "解析token失敗" })
        }
    }
}