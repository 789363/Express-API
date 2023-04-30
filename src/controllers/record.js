const { Router: expressRouter, response } = require("express");
const Form = require("../models/form");
const Question = require("../models/question");
const Record = require("../models/record")
const Account = require("../models/account");
const verifyToken = require("../middleware/verify_token");
const getAccount = require("../middleware/getAccountIdFromDecodedToken");
const { QueryError, HasMany, UUIDV4 } = require("sequelize");
const { Op, where } = require("sequelize");
const { v4: uuidv4 } = require('uuid');
const Role_Form = require("../models/role_form");
// Export routes mapper (function)
module.exports = (ctx, app) => {
    const router = expressRouter();
    const database = ctx.sequelize;

    //填寫紀錄
    router.post("/fill", verifyToken(),verifyAuthWithQuestionId, getAccount(), async (req, res) => {
        try {
            await database.sync()
            const response = req.body.response
            const questionsId = req.body.questions_id
            const seconds = req.body.seconds
            await Record.create({
                record_id: uuidv4(),
                reponse: response,
                seconds: seconds,
                account_id: req.account_id,
                questions_id: questionsId
            })
            return res.status(200).json({ message: "填寫成功" });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "新增失敗，請重新再試一次", error: err }); // 更新失敗
        }
    })

    async function verifyAuthWithQuestionId(req, res, next) {
        try {
            const questionId = req.body.questions_id
            await database.sync()
            const { form_id } = await Question.findOne({
                attributes: ["form_id"],
                where: { questions_id: questionId }
            })

            const { role_id } = req.decoded

            const role_form = await Role_Form.findOne({
                where: {
                    role_id,
                    form_id
                }
            })

            if (role_form === null) {
                return res.status(404).json({ message: "權限不足" })
            }

            if (role_form.is_viewable) {
                return next()
            } else {
                return res.status(404).json({ message: "權限不足" })
            }

        } catch (err) {
            return res.status(500).json({ message: err.message })
        }
    }
    
    app.use("/api/record", router);
};