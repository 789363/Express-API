const Role_Form = require("../models/role_form")

module.exports = (verifyType = "is_editable") => {
    return async (req, res, next) => {
        try {
            const { role_id } = req.decoded
            const form_id  = req.body.form_id ?? req.params.form_id

            const role_form = await Role_Form.findOne({
                where: {
                    role_id,
                    form_id
                }
            })

            if (role_form === null) {
                return res.status(404).json({ message: "權限不足" })
            }

            if (role_form[verifyType]) {
                return next()
            } else {
                return res.status(404).json({ message: "權限不足" })
            }

        } catch (error) {
            return res.status(500).json({ message: `有錯誤發生了,${error}` })
        }
    }
}