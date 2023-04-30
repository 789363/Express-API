const { Router: expressRouter } = require("express");
const jwt = require("jsonwebtoken");
const Form = require("../models/form");
const Question = require("../models/question");
const Option = require("../models/option");
const { v4: uuidv4 } = require('uuid');
const verifyToken = require("../middleware/verify_token");
const { Op } = require("sequelize");
const Role_Form = require("../models/role_form");

// Export routes mapper (function)
module.exports = (ctx, app) => {
    const router = expressRouter();
    const database = ctx.sequelize;

    //查看選項
    router.get("/get/:option_id", verifyToken(), verifyAuthWithOptionId, async (req, res) => {
        try {
            const optionId = req.params.option_id
            await database.sync()
            const option = await Option.findOne({ where: { option_id: optionId } })
            return res.status(200).json(option)
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    //刪除選項
    router.delete("/delete", verifyToken(),verifyAuthWithOptionId, async (req, res) => {
        try {
            await database.sync()
            const option = await Option.findOne({
                where: {
                    option_id: req.body.option_id
                }
            })
            if (option === null) return res.status(404).json({ message: "找不到選項" })
            const count = await Option.count({
                where: {
                    questions_id: option.questions_id
                }
            })
            if (count === 2) return res.status(403).json({ message: "至少要有兩個選項" })
            await Option.destroy({
                where: {
                    option_id: req.body.option_id
                }
            })
            return res.status(200).json({ message: "刪除成功" });

        } catch (err) {
            //資料庫操作錯誤將回傳500及錯誤訊息
            res.status(500).json({ message: "remove faild" })
        }
    });

    //新增選項
    router.post("/create", sequence,verifyToken(),verifyAuthWithQuestionId, async (req, res) => {

        try {
            await database.sync()
            const questionId = req.body.question_id

            console.log(questionId);

            const question = await Question.findOne({
                where: {
                    questions_id: questionId
                }
            })

            if (question == null) {
                return res.status(404).json({ message: "無此問題" });
            }
            const option = await Option.create({
                option_id: uuidv4(),
                option_title: "Option Title Here",
                sequence: res.sequence,
                questions_id: questionId
            }
            )
            return res.status(200).json({ message: "新增成功", option: option });
        } catch (err) {
            res.status(400).json({ message: "新增失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });

    //修改選項名稱
    router.post("/update",verifyToken(),verifyAuthWithOptionId, async (req, res) => {
        const optionId = req.body.option_id
        const optionTitle = req.body.option_title
        try {
            await database.sync()
            const option = await Option.findOne({
                where: { option_id: optionId }
            })
            if (option == null) { return res.status(404).json({ message: "無此選項" }) }
            await option.update({ option_title: optionTitle })
            return res.status(200).json({ message: "更改選項成功" });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "新增失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });

    //update option sequence
    router.post("/sequence/update",verifyToken(),verifyAuthWithOptionId, async (req, res) => {
        try {
            const optionId = req.body.option_id
            const newsequence = parseInt(req.body.newsequence)
            await database.sync()
            const updateOption = await Option.findOne({
                where: {
                    option_id: optionId
                }
            })
            if (updateOption === null) return res.status(404).json({ message: "找不到選項" })

            const smallerSequnce = newsequence < updateOption.sequence ? newsequence : updateOption.sequence
            const biggerSequnce = newsequence > updateOption.sequence ? newsequence : updateOption.sequence
            // get new sequence option and below sequence option
            const updateOptions = await Option.findAll({
                where: {
                    sequence: {
                        [Op.between]: [smallerSequnce, biggerSequnce],
                    }
                }
            })

            const offset = newsequence > updateOption.sequence ? -1 : 1

            // Update these options
            await Promise.all(updateOptions.map(async (option) => {

                // update sequence for old sequence to new sequence
                if (option.option_id === optionId) {
                    await option.update({ sequence: newsequence })
                    return
                }

                await option.update({ sequence: option.sequence + offset })
                return
            }))

            return res.status(200).json({ message: "更新順序成功" });
        } catch (error) {
            res.status(500).json({ message: "更新順序失敗", error })
        }
    })

    //查看順序
    async function sequence(req, res, next) {
        try {
            const questionId = req.body.question_id
            await database.sync()
            const option = await Option.findOne({
                where: { questions_id: questionId },
                order: [["sequence", "DESC"]]
            })
            if (option === null) {
                return res.sequence = 0
            }
            res.sequence = parseInt(option.sequence) + 1
        } catch (err) {
            return res.status(500).json({ message: err.message })
        } finally {
            next();
        }
    }

    async function verifyAuthWithQuestionId(req, res, next) {
        try {
            const questionId = req.body.questions_id ?? req.body.question_id
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

            if (role_form.is_editable) {
                return next()
            } else {
                return res.status(404).json({ message: "權限不足" })
            }

        } catch (err) {
            return res.status(500).json({ message: err.message })
        }
    }

    async function verifyAuthWithOptionId(req, res, next) {
        try {
            const optionId = req.params.option_id ?? req.body.option_id
            await database.sync()
            const { questions_id } = await Option.findOne({
                attributes: ["questions_id"],
                where: { option_id: optionId }
            })
            const { form_id } = await Question.findOne({
                attributes: ["form_id"],
                where: { questions_id }
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

            if (role_form.is_editable) {
                return next()
            } else {
                return res.status(404).json({ message: "權限不足" })
            }

        } catch (err) {
            return res.status(500).json({ message: err.message })
        }
    }

    app.use("/api/option", router);
};
