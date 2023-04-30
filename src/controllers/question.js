const { Router: expressRouter } = require("express");
const jwt = require("jsonwebtoken");
const Form = require("../models/form");
const Question = require("../models/question");
const Option = require("../models/option");
const { v4: uuidv4 } = require('uuid');
const verifyToken = require("../middleware/verify_token");
const { Op } = require("sequelize");
const Role_Form = require("../models/role_form");
const verify_role_form = require("../middleware/verify_role_form");

// Export routes mapper (function)
module.exports = (ctx, app) => {
    const router = expressRouter();
    const database = ctx.sequelize;

    //新增question
    router.post("/create", verifyToken(), verify_role_form("is_editable") , sequence, async (req, res) => {
        const formId = req.body.form_id
        try {
            await database.sync()
            const questionID = uuidv4()
            const question = await Question.create({
                questions_id: questionID,
                questions_name: "Option Title Here",
                questions_type: "radio",
                sequence: res.sequence,
                form_id: formId
            })

            const options = await Option.bulkCreate([{
                option_id: uuidv4(),
                option_title: "Option Title Here",
                sequence: 0,
                questions_id: questionID
            },
            {
                option_id: uuidv4(),
                option_title: "Option Title Here",
                sequence: 1,
                questions_id: questionID
            }])

            return res.status(200).json({ message: "新增成功", question: question, options: options });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "新增失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });

    //修改question
    router.post("/update", verifyToken(),verifyAuthWithQuestionId, async (req, res) => {
        const questionName = req.body.question_name
        const questionId = req.body.question_id
        try {
            await database.sync()
            const question = await Question.findOne({
                where: { questions_id: questionId }
            })
            if (question == null) { return res.status(404).json({ message: "無此問題" }) }
            await question.update({ questions_name: questionName })
            return res.status(200).json({ message: "更改問題成功" });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "更新失敗，請重新再試一次", error: err }); // 更新失敗
        }
    })

    //修改question type
    router.post("/type/update", verifyToken(),verifyAuthWithQuestionId, async (req, res) => {
        const questionsId = req.body.questions_id
        const questionsType = req.body.questions_type

        if (questionsType !== "text" && questionsType !== "radio" && questionsType !== "checkbox" && questionsType !== "number"
        && questionsType !== "date") {
            return res.status(400).json({ message: "請輸入正確的題型" })
        }
        try {
            await database.sync()
            const question = await Question.findOne({
                where: { questions_id: questionsId }
            })
            if (question == null) { return res.status(404).json({ message: "無此問題" }) }
            await question.update({ questions_type: questionsType })
            if (questionsType === "radio" || questionsType === "checkbox") {
                return res.status(200).json({ message: "更改選項成功" });
            }
            let options = []
            await Option.destroy({ where: { questions_id: questionsId } })
            if (questionsType ==="number"|| questionsType === "text"){
                options = await Option.bulkCreate([{
                    option_id: uuidv4(),
                    option_title: "10",
                    sequence: 0,
                    questions_id: questionsId
                },
                {
                    option_id: uuidv4(),
                    option_title: "20",
                    sequence: 1,
                    questions_id: questionsId
                }])
            }
            return res.status(200).json({ message: "更改選項成功" , options: options});
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "新增失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });

    //删除question
    router.delete("/delete", verifyToken(),verifyAuthWithQuestionId, async (req, res) => {
        try {

            await database.sync()
            const question = await Question.findOne({
                where: {
                    questions_id: req.body.questions_id
                }
            })
            if (question === null) return res.status(404).json({ message: "找不到問題" })
            const count = await Question.count({
                where: {
                    form_id : question.form_id
                }
            })
            if (count === 1) return res.status(403).json({ message: "至少要有一個問題" })
            
            await Option.destroy({
                where: {
                    questions_id: req.body.questions_id
                }
            })
            await Question.destroy({
                where: {
                    questions_id: req.body.questions_id
                }
            })
            return res.status(200).json({ message: "刪除成功" });

        } catch (err) {
            //資料庫操作錯誤將回傳500及錯誤訊息
            res.status(500).json({ message: "remove faild" })
        }
    });

    // 調整問題順序 
    router.post("/sequence/update", verifyToken(),verifyAuthWithQuestionId, async (req, res) => {
        try {
            const questionsId = req.body.questions_id
            const newsequence = parseInt(req.body.newsequence)
            await database.sync()
            const updateQuestion = await Question.findOne({
                where: {
                    questions_id: questionsId
                }
            })

            if (updateQuestion === null) return res.status(404).json({ message: "找不到問題" })

            const smallerSequnce = newsequence < updateQuestion.sequence ? newsequence : updateQuestion.sequence
            const biggerSequnce = newsequence > updateQuestion.sequence ? newsequence : updateQuestion.sequence
            // get new sequence question and below sequence question
            const updateQuestions = await Question.findAll({
                where: {
                    sequence: {
                        [Op.between]: [smallerSequnce , biggerSequnce],
                    }
                }
            })

            const offset = newsequence > updateQuestion.sequence ? -1 : 1

            // Update these questions
            await Promise.all(updateQuestions.map(async (question) => {

                // update sequence for old sequence to new sequence
                if (question.questions_id === questionsId) {
                    await question.update({ sequence: newsequence })
                    return
                }

                await question.update({ sequence: question.sequence + offset })
                return
            }))

            return res.status(200).json({ message: "更新順序成功" });
        } catch (error) {
            res.status(500).json({ message: "更新順序失敗", error })
        }
    })

    //查詢question
    router.get("/get/:question_id", verifyToken(),verifyAuthWithQuestionId, async (req, res) => {
        try {
            const question_id = req.params.question_id
            await database.sync()
            const question = await Question.findOne({ where: { questions_id: question_id } })
            return res.status(200).json(question)
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    //查看question順序
    async function sequence(req, res, next) {
        try {
            const formId = req.body.form_id
            await database.sync()
            const question = await Question.findOne({
                where: { form_id: formId },
                order: [["sequence", "DESC"]]
            })

            if (question === null) {
                return res.sequence = 0
            }
            res.sequence = parseInt(question.sequence) + 1
        } catch (err) {
            return res.status(500).json({ message: err.message })
        } finally {
            next();
        }
    }

    async function verifyAuthWithQuestionId(req, res, next) {
        try {
            let questionId = req.params.question_id ?? req.body.questions_id
            if (questionId === undefined) questionId = req.body.question_id
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

    app.use("/api/question", router);
};
