const { Router: expressRouter } = require("express");
const Form = require("../models/form");
const Question = require("../models/question");
const Option = require("../models/option");
const Record = require("../models/record")
const Account = require("../models/account");
const Role_Form = require("../models/role_form");
const json2csv = require('json2csv');
const verifyToken = require("../middleware/verify_token");
const { v4: uuidv4 } = require('uuid');
const { QueryError, HasMany, Sequelize } = require("sequelize");
const getAccountIdFromDecodedToken = require("../middleware/getAccountIdFromDecodedToken");
const verifyRoleForm = require("../middleware/verify_role_form");
const Role = require("../models/role");
const { jsonToXlsx } = require('json-and-xlsx');

// Export routes mapper (function)
module.exports = (ctx, app) => {
    const router = expressRouter();
    const database = ctx.sequelize;

    // 查看問卷統計結果 根據回答結果group 後count
    router.get("/getresult/count/:form_id", verifyToken("is_result_visable"), async (req, res) => {
        try {
            const form_id = req.params.form_id
            const form = await Form.findOne({ where: { form_id: form_id } })
            if (form === null) return res.status(404).json({ message: "找不到問卷" })

            //Get all questions in this form
            const questions = await Question.findAll({ where: { form_id: form_id } })

            const form_result = await Promise.all(questions.map(async (question) => {

                // get every record of this question and group by the result
                const question_result = await Record.findAll({
                    attributes: [
                        'reponse',
                        [Sequelize.fn("COUNT", Sequelize.col("reponse")), "count_response"],
                    ],
                    where: { questions_id: question.questions_id },
                    group: "reponse",
                })

                // Organize the result
                const returnLabels = question_result.map(result => result.reponse)
                const returnCount = question_result.map(result => result.dataValues.count_response)
                const returnData = {
                    labels: returnLabels,
                    datasets: [
                        {
                            label: question.questions_name,
                            data: returnCount,
                        }
                    ]
                }

                const fillNumber = {
                    filled: returnCount.reduce((a, b) => a + b, 0),
                }
                //2023.03.02 Liang 多回傳sequence欄位
                return { returnData, question_type: question.questions_type, fillNumber, question_sequence: question.sequence }

            }))

            let maxnumber = 0
            form_result.forEach(element => {
                if (element['fillNumber']['filled'] > maxnumber) {
                    maxnumber = element['fillNumber']['filled']
                }
            });
            form_result.forEach(element => {
                element['fillNumber']['totalNumber'] = maxnumber
            });

            res.status(200).json(form_result)
        } catch (err) {
            res.status(500).json({ message: "取得統計結果失敗" });
        }
    })

    // 查看問卷統計結果 根據回答結果group 後sum
    router.get("/getresult/sum/:form_id", verifyToken("is_result_visable"), async (req, res) => {
        try {
            const form_id = req.params.form_id
            const form = await Form.findOne({ where: { form_id: form_id } })
            if (form === null) return res.status(404).json({ message: "找不到問卷" })

            //Get all questions in this form
            const questions = await Question.findAll({ where: { form_id: form_id } })

            const form_result = await Promise.all(questions.map(async (question) => {

                // get every record of this question and group by the result
                const question_result = await Record.findAll({
                    attributes: [
                        'reponse',
                        [Sequelize.fn("SUM", Sequelize.col("reponse")), "sum_response"],
                    ],
                    where: { questions_id: question.questions_id },
                    group: "reponse",
                })

                // Organize the result
                const returnLabels = question_result.map(result => result.reponse)
                const returnSum = question_result.map(result => result.dataValues.sum_response)
                const returnData = {
                    labels: returnLabels,
                    datasets: [
                        {
                            label: question.questions_name,
                            data: returnSum,
                        }
                    ]
                }
                return returnData

            }))
            res.status(200).json(form_result)
        } catch (err) {
            res.status(500).json({ message: "取得統計結果失敗" });
        }
    })

    //新增問卷
    router.post("/create", verifyToken("is_form_addable"), async (req, res) => {
        try {
            await database.sync()
            const questionID = uuidv4()
            let color = req.body.color ?? "#000000"
            // Get member data from decoded token
            const { account_name, role_id } = req.decoded;
            const { account_id } = await Account.findOne({
                attributes: ['account_id'],
                where: { account_name: account_name }
            })

            // Create new form
            const form = await Form.create({
                form_name: "Form Title Here",
                fillout: 0,
                color: color,
                create_by: account_id,
                online_status: 1
            })
            await Question.create({
                questions_id: questionID,
                questions_name: "Option Title Here",
                questions_type: "radio",
                sequence: 0,
                form_id: form.form_id
            })

            await Option.bulkCreate([{
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

            const roles = await Role.findAll({
                attributes: ['role_id'],
            })

            await Promise.all(roles.map(async (role) => {
                let is_viewable = false
                let is_editable = false

                if (role.role_id === role_id) {
                    is_viewable = true
                    is_editable = true
                }

                await Role_Form.create({
                    role_id: role.role_id,
                    form_id: form.form_id,
                    is_viewable,
                    is_editable
                })
            }))

            return res.status(200).json({ message: "新增表單成功", form: form.form_id });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "新增失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });

    //修改問卷名稱
    router.post("/update", verifyToken(), verifyRoleForm("is_editable"), async (req, res) => {
        const formName = req.body.form_name
        const formId = req.body.form_id
        try {
            await database.sync()
            const form = await Form.findOne({
                where: { form_id: formId }
            })
            if (form == null) { return res.status(404).json({ message: "無此表單" }) }
            await form.update({ form_name: formName })
            return res.status(200).json({ message: "更改表單成功" });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "新增失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });

    //修改問卷顏色
    router.post("/color/update", verifyToken(), verifyRoleForm("is_editable"), async (req, res) => {
        const color = req.body.color
        const formId = req.body.form_id
        try {
            await database.sync()
            const form = await Form.findOne({
                where: { form_id: formId }
            })
            if (form == null) { return res.status(404).json({ message: "無此表單" }) }
            await form.update({ color: color })
            return res.status(200).json({ message: "更改表單成功" });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "新增失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });

    //查看問卷內容
    router.get("/get/:form_id", verifyToken(), verifyRoleForm("is_editable"), async (req, res) => {
        try {
            const form_id = req.params.form_id;
            await database.sync()
            const form = await Form.findOne({
                where: { form_id: form_id },
                include: {
                    model: Question,
                    include: {
                        model: Option,
                    },
                },
                order: [
                    [Question, 'sequence', 'ASC'],
                    [Question, Option, 'sequence', 'ASC']
                ],
            })
            if (form === null) return res.status(404).json({ message: "沒有該問卷" })
            return res.status(200).json(form)
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    //2023.03.24 Liang 複製並新增問卷內容
    router.get("/copy/:form_id", verifyToken(), verifyRoleForm("is_editable"), async (req, res) => {
        try {
            const form_id = req.params.form_id;
            await database.sync()
            
            const { account_name, role_id } = req.decoded;
            const { account_id } = await Account.findOne({
                attributes: ['account_id'],
                where: { account_name: account_name }
            })
            // 撈Form
            const form_list = await Form.findOne({ attributes: ['form_name', 'fillout', 'online_status', 'color'], where: { form_id: String(form_id) } })
            // 根據這個Form，創建新的Form、並得到新的id
            const form_copy = await Form.create({
                form_name: form_list.form_name + '_(複製)',
                fillout: form_list.fillout,
                color: form_list.color,
                create_by: account_id,
                online_status: form_list.online_status
            })
            // 把該Form 的所有Question撈出來
            const questions = await Question.findAll({ attributes: ['questions_id'], where: { form_id: String(form_id) } })
            // 根據這些Question撈出資訊
            await Promise.all(questions.map(async (question) => {
                const questions_list = await Question.findOne({ attributes: ['questions_id', 'questions_name', 'questions_type', 'sequence'], where: { questions_id: String(question.questions_id) } })
                const questionID = uuidv4();
                // 根據新的id，創建新的Question，並把資訊丟進去
                await Question.create({
                    questions_id: questionID,
                    questions_name: questions_list.questions_name,
                    questions_type: questions_list.questions_type,
                    sequence: questions_list.sequence,
                    form_id: form_copy.form_id
                })
                // 撈出這個Question，有哪些Option
                const question_option = await Option.findAll({ attributes: ['questions_id', 'option_id'], where: { questions_id: question.questions_id } })
                // 根據Question，撈出Option資訊
                await Promise.all(question_option.map(async (option) => {
                    const option_list = await Option.findOne({ attributes: ['option_id', 'option_title', 'sequence'], where: { questions_id: option.questions_id, option_id: option.option_id } })
                    // 根據新的Question，創建Option，並把資訊丟進去
                    await Option.create({
                        option_id: uuidv4(),
                        option_title: option_list.option_title,
                        sequence: option_list.sequence,
                        questions_id: questionID
                    })
                }))
            }))
            // 撈出所有角色資料
            const roles = await Role.findAll({
                attributes: ['role_id'],
            })

            await Promise.all(roles.map(async (role) => {
                let is_viewable = false
                let is_editable = false
                // 如果角色為admin 或者 manager 則給填寫跟編輯 若不是則不給任何權限
                if (role.role_id === 1 || role.role_id === 2) {
                    is_viewable = true
                    is_editable = true
                }
                // 並依據新的id，給予相對應的權限
                await Role_Form.create({
                    role_id: role.role_id,
                    form_id: form_copy.form_id,
                    is_viewable,
                    is_editable
                })
            }))
            
            if (form_copy === null) return res.status(404).json({ message: "沒有該問卷" })
            return res.status(200).json(form_copy ,{message: "複製問卷成功。"})
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    //查看問卷內容來填寫
    router.get("/getformtofill/:form_id", verifyToken(), verifyRoleForm("is_viewable"), async (req, res) => {
        try {
            const form_id = req.params.form_id;
            await database.sync()
            const form = await Form.findOne({
                where: { form_id: form_id },
                include: {
                    model: Question,
                    include: {
                        model: Option,
                    },
                },
                order: [
                    [Question, 'sequence', 'ASC'],
                    [Question, Option, 'sequence', 'ASC']
                ],
            })
            if (form === null) return res.status(404).json({ message: "沒有該問卷" })
            return res.status(200).json(form)
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    //查看問卷可填寫及可編輯的角色
    router.get("/getroleform/:form_id", verifyToken(), verifyRoleForm("is_editable"), async (req, res) => {
        try {
            const form_id = req.params.form_id;
            await database.sync()
            const role_form = await Role_Form.findAll({
                attributes: ['role_id', 'is_viewable', 'is_editable'],
                where: { form_id: form_id },
            })

            const role_form_data = await Promise.all(role_form.map(async (role) => {
                const { role_name } = await Role.findOne({
                    attributes: ['role_name'],
                    where: { role_id: role.role_id }
                })
                return {
                    role_id: role.role_id,
                    is_viewable: role.is_viewable,
                    is_editable: role.is_editable,
                    role_name
                }
            }))

            if (role_form === null) return res.status(404).json({ message: "沒有該問卷" })
            return res.status(200).json(role_form_data)
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    // 刪除問卷
    router.delete("/delete", verifyToken("is_form_deletable"), async (req, res) => {
        try {

            await database.sync()
            const form = await Form.findOne({
                where: {
                    form_id: req.body.form_id
                }
            })
            if (form === null) return res.status(404).json({ message: "找不到問卷" })
            await Question.destroy({
                where: {
                    form_id: req.body.form_id
                }
            })
            await Form.destroy({
                where: {
                    form_id: req.body.form_id
                }
            })
            await Option.destroy({
                where: { questions_id: null }
            })
            await Role_Form.destroy({//2023.03.24 Liang 刪除資料表裡面Null的資料
                where: { form_id: null }
            })

            return res.status(200).json({ message: "刪除成功" });

        } catch (err) {
            //資料庫操作錯誤將回傳500及錯誤訊息
            res.status(500).json({ message: "remove faild" })
        }
    });

    // update role form if it exists and updates it, if not, create a new one
    router.post("/updateroleform", verifyToken(), verifyRoleForm("is_editable"), async (req, res) => {
        try {
            const { role_id, form_id, is_viewable, is_editable } = req.body
            await database.sync()

            // can't update self
            if (role_id === req.decoded.role_id) return res.status(400).json({ message: "無法修改自己的權限" })

            await Role_Form.update({ is_viewable, is_editable },
                {
                    where: {
                        role_id,
                        form_id
                    }
                }
            )

            return res.status(200).json({ message: "更新成功" });

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    //顯示問卷頁面
    router.get("/getbypage/:page/:type", verifyToken(), getAccountIdFromDecodedToken(), async (req, res) => {
        try {
            const page = req.params.page;
            const type = req.params.type;
            if (type !== "is_viewable" && type !== "is_editable" && type !== "getresult") {
                return res.status(400).json({ message: "type 參數錯誤" })
            }

            await database.sync()

            const where = type !== "getresult" ? { role_id: req.decoded.role_id, [type]: true } :
                { role_id: req.decoded.role_id }

            const forms = await Form.findAll({
                attributes: ['form_id', 'form_name', 'color'],
                offset: (page - 1) * 20,
                limit: page * 20,
                include: {
                    model: Role_Form,
                    attributes: ['role_id', 'is_viewable', 'is_editable'],
                    where
                }
            })

            const form_list = await Promise.all(forms.map(async (form) => {

                // Get how many questions in this form
                const questions = await Question.findAll({ attributes: ['questions_id'], where: { form_id: form.form_id } })

                // is every question has been answered by this user?
                // will return true if this question has been answered or will be false
                const records = await Promise.all(questions.map(async (question) => {
                    const records = await Record.findOne({ attributes: ['record_id'], where: { questions_id: question.questions_id, account_id: req.account_id } })
                    if (records === null) return false
                    return true
                }))

                // Check is records array is filled by true means this form has been answered
                const isFormFillend = records.every(r => r === true)
                return {
                    form_id: form.form_id, form_name: form.form_name, isFormFillend: isFormFillend,
                    isEditable: form.role_forms[0].dataValues.is_editable, color: form.color
                }

            }))

            return res.status(200).json(form_list)
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    //2023.03.08 Liang 顯示我的最愛頁面
    router.get("/getbyfpage/:page/:type/:result", verifyToken(), getAccountIdFromDecodedToken(), async (req, res) => {
        try {
            const page = req.params.page;
            const type = req.params.type;
            const result = req.params.result;
            if (type !== "is_viewable" && type !== "is_editable" && type !== "getresult") {
                return res.status(400).json({ message: "type 參數錯誤" })
            }

            await database.sync()

            const where = type !== "getresult" ? { role_id: req.decoded.role_id, [type]: true } :
                { role_id: req.decoded.role_id }

            const forms = await Form.findAll({
                attributes: ['form_id', 'form_name', 'color'],
                offset: (page - 1) * 20,
                limit: page * 20,
                include: {
                    model: Role_Form,
                    attributes: ['role_id', 'is_viewable', 'is_editable'],
                    where
                }
            })
            //陣列傳進來後 須做分號的處理
            const result_arr = result.split(",");
            //撈form，取得有幾筆，就會回傳幾筆給前端
            const form_list = await Promise.all(forms.map(async (form) => {
                const form_f = await Form.findAll({ attributes: ['form_id'], where: { form_id: form.form_id } })
                //再撈一次form，來做是否為我的最愛的判斷
                const records = await Promise.all(form_f.map(async (form) => {
                    const records = await Form.findOne({ attributes: ['form_id'], where: { form_id: form.form_id } })
                    //撈出前端傳過來的陣列
                    for (let i = 0; i < result_arr.length; i++) {
                        //如果有有配對到 回傳true 否則false
                        // console.log('records.form_id : '+records.form_id+' results.form_id :'+result_arr[i]);
                        if (Number(records.form_id) === Number(result_arr[i])) {
                            return true
                        }
                    }
                }))
                //把上面回傳的布林值 撈一次放到isFormFavorite
                const isFormFavorite = records.every(r => r === true)
                // console.log(isFormFavorite);
                //此API回傳的所有值
                return {
                    form_id: form.form_id,
                    form_name: form.form_name,
                    isFormFavorite: isFormFavorite,
                    isEditable: form.role_forms[0].dataValues.is_editable,
                    color: form.color
                }

            }))
            return res.status(200).json(form_list)


        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    //顯示填答人數
    router.post("/getfill", verifyToken(), getAccountIdFromDecodedToken(), async (req, res) => {
        try {
            const form_id = req.body.form_id;
            await database.sync()
            //查看哪個角色有權限可以填寫該問卷
            const role_form = await Role_Form.findAll({
                attributes: ['role_id'],
                where: { form_id: form_id, is_viewable: true }
            })
            //初始化計數
            let total = 0
            let fill = 0

            await Promise.all(role_form.map(async (role) => {
                //找出該角色包含的所有員工
                const accounts = await Account.findAll({
                    where: {
                        role_id: role.role_id
                    }
                })

                //判斷該角色全部相關帳號是否有完成此問卷的填寫
                await Promise.all(accounts.map(async (account) => {
                    const questions = await Question.findAll({ attributes: ['questions_id'], where: { form_id: form_id } })
                    const records = await Promise.all(questions.map(async (question) => {
                        const records = await Record.findOne({ attributes: ['record_id'], where: { questions_id: question.questions_id, account_id: account.account_id } })
                        if (records === null) return false
                        return true
                    }))
                    //該帳號在此問卷的題目都有填寫的話 填寫人數+1
                    if (records.every(r => r === true)) {
                        fill += 1
                    }
                    total += 1
                }))
            }))

            return res.status(200).json({ total, fill });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    // //匯出表單
    router.get("/export/:form_id", verifyToken("is_excel_exportable"), async (req, res) => {
        try {
            const form_id = req.params.form_id
            const form = await Form.findOne({ where: { form_id: form_id } })
            if (form === null) return res.status(404).json({ message: "找不到問卷" })
            //找出要匯出問卷的所有問題
            const questions = await Question.findAll({ where: { form_id: form_id } })
            const form_result = await Promise.all(questions.map(async (question) => {
                //找出所有填寫紀錄
                const question_result = await Record.findAll({
                    attributes: [
                        [database.literal('DATE_FORMAT(record.createdAt, "%Y-%m-%d")'), 'dates'],
                        'reponse', 'seconds', 'createdAt', 'account_id'

                    ],
                    where: { questions_id: question.questions_id }
                })
                //將填寫紀錄及使用者帳號、部分合併成data_result
                const data_result = await Promise.all(question_result.map(async (record) => {
                    const account = await Account.findOne({
                        attributes: ['fuji_person_id', 'fuji_dept_id'],
                        where: { account_id: record.account_id }
                    })
                    //按照excel上的欄位名稱進行命名
                    return {
                        "問卷名稱": question.questions_name,
                        "問卷類型": question.questions_type,
                        "回答": record.reponse,
                        "日期": record.dataValues.dates,
                        "填答時間": record.createdAt,
                        "花費秒數": record.seconds,
                        "使用者帳號": account.fuji_person_id,
                        "部門": account.fuji_dept_id
                    }
                }))
                return { data_result }
            }))
            //從data_result取出需要的值 去除不要的{ } 
            const data_result = form_result.map(({ data_result }) => data_result);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.set('Content-Disposition', 'attachment; filename="export.xlsx"');
            //去除最後不要的兩層{ } 
            const returnDataArray = data_result.reduce((prev, curr) => {
                return [...prev, ...curr];
            }, []);
            //將returnDataArray轉成excel send至前端
            const xlsx = jsonToXlsx.readAndGetBuffer(returnDataArray);
            res.status(200).send(xlsx)
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })
    app.use("/api/form", router);
};