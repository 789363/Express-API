const { Router: expressRouter } = require("express");
const jwt = require("jsonwebtoken");
const Account = require("../models/account.js");
const verifyToken = require("../middleware/verify_token");
const sendPasswordEmail = require("../utils/send_password_email");
const sendAccountEmail = require("../utils/send_account_email");
const { Op, where } = require("sequelize");
const verify_fuji_employee = require("../middleware/verify_fuji_employee.js");
const getFujiDataFromEmail = require("../middleware/getFujiDataFromEmail.js");
const Role = require("../models/role.js");

// Export routes mapper (function)
module.exports = (ctx, app) => {
    const router = expressRouter();
    const database = ctx.sequelize;
    //取得所有帳號
    router.get("/getall", verifyToken("is_account_visable"), async (req, res) => {
        try {
            await database.sync()
            const account = await Account.findAll()
            return res.status(200).json({ account })
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    //點擊重設密碼
    router.post("/change/:create_token", checkToken, async (req, res) => {
        const password = req.body.password;
        const email = res.decoded.email;
        try {
            await database.sync()
            const account = await Account.findOne({
                where: {
                    email: email
                }
            })
            await account.update({
                password: password
            });
            res.status(200).send("更改成功可關閉頁面");

        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "更改失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });


    // 點擊新增會員
    router.get("/verify/:create_token", checkToken, async (req, res) => {
        const email = res.decoded.email;
        const accountName = res.decoded.account_name
        const password = res.decoded.password
        const fuji_person_id = res.decoded.fuji_person_id
        const fuji_dept_id = res.decoded.fuji_dept_id
        try {
            await database.sync()
            const account = await Account.findOne({
                where: {
                    email: email,
                }
            })
            if (account !== null) {
                return res.status(403).json({ message: "信箱已重複" });
            }
            await Account.create({
                account_name: accountName,
                role_id: "3",
                status: "1",
                password,
                email,
                fuji_person_id,
                fuji_dept_id
            })
            return res.status(200).send("新增成功");
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "新增會員失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });

    //顯示帳號
    router.get("/:page/:name?", verifyToken("is_account_visable"), async (req, res) => {
        const page = req.params.page
        const name = req.params.name ?? ""
        try {
            await database.sync()
            const account = await Account.findAll({
                where: {
                    account_name: {
                        [Op.like]: `%${name}%`
                    }

                },

                offset: (page - 1) * 20, limit: /*page **/ 20  //2023.03.13 Liang 帳號設定頁面筆數限制BUG調整
            })
            const accountinfo = await Promise.all(account.map(async (account) => {
                const rold_name = await Role.findOne({
                    attributes: ['role_name'],
                    where: { role_id: account.role_id }
                })
                return {
                    account_id: account.account_id,
                    account_fuji_person_id: account.fuji_person_id,
                    account_name: account.account_name,
                    role_id: rold_name.role_name,
                    status: account.status,
                    account_email: account.email
                }
            }))
            return res.status(200).json( { account:accountinfo } )
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })

    // 登入
    router.post("/login", getFujiDataFromEmail(), verify_fuji_employee(false), async (req, res) => {
        const accountEmail = req.body.email;
        const accountPassword = req.body.password;
        try {
            await database.sync()
            const account = await Account.findOne({
                where: {
                    email: accountEmail,
                }
            })
            if (account == null) {
                return res.status(404).json({ message: "Can't find member" })
            }
            if (account.password !== accountPassword) {
                return res.status(404).json({ message: "Password is wrong" })
            }
            if (!account.status) return res.status(403).json({ message: "尚未開啟帳號" })

            // if database dept id not equel to the dapt id from fuji
            if (account.fuji_dept_id !== res.locals.deptId) {
                await account.update({
                    fuji_dept_id: res.locals.deptId
                })
            }

            // Get role is_*_visaible permission
            const role = await Role.findOne({
                where: {
                    role_id: account.role_id
                }
            })
            if (role == null) {
                return res.status(404).json({ message: "Can't find role" })
            }

            const info = { account_name: account.account_name, role_id: role.role_id, role_name: role.role_name };
            const token = jwt.sign(info, process.env.JWT_SECRET_KEY, { expiresIn: 1000 * 60 * 15 });
            const auth = {
                is_result_visable: role.is_result_visable,
                is_account_visable: role.is_account_visable,
                is_role_visable: role.is_role_visable,
                is_form_addable: role.is_form_addable,
                is_form_deletable: role.is_form_deletable
            }
            return res.status(200).json({ message: "登入成功", token, auth });
        } catch (err) {
            // 如果資料庫出現錯誤時回報 status:500 並回傳錯誤訊息
            res.status(500).json({ message: err.message });
        }

    });

    //找出特定帳號
    router.post("/get/:account_id", verifyToken("is_account_editable"), async (req, res) => {
        const accountId = req.params.account_id;
        try {
            await database.sync()
            const account = await Account.findOne({
                where: {
                    account_id: accountId,
                }
            })
            if (account == null) {
                return res.status(404).json({ message: "Can't find member" })
            }
            return res.status(200).json(account);

        } catch (err) {
            // 如果資料庫出現錯誤時回報 status:500 並回傳錯誤訊息
            res.status(500).json({ message: err.message });
        }

    });

    //送出註冊信
    router.post("/verifyemail", verify_fuji_employee(true), async (req, res) => {
        const information = {
            email: req.body.email,
            account_name: req.body.account_name,
            password: req.body.password,
            fuji_person_id: req.body.fuji_person_id,
            fuji_dept_id: res.locals.deptId
        }

        // 檢查空值
        for (const key of Object.keys(information)) {
            if (information[key] === '' || information[key] === undefined) {
                return res.status(500).json({ message: "資料不完整" })
            }
        }

        try {
            sendAccountEmail(information);
            return res.status(200).json({ message: "寄信成功" })
        } catch (err) {
            // 如果資料庫出現錯誤時回報 status:500 並回傳錯誤訊息
            res.status(500).json({ message: err.message })
        }
    });


    //刪除帳號
    router.delete("/delete", verifyToken("is_account_deletable"), async (req, res) => {
        try {
            await database.sync()
            const account = await Account.findOne({
                where: {
                    account_id: req.body.id
                }
            })
            if (account == null) {
                return res.status(404).json({ message: "無此用戶" });
            }
            if (account.account_id === 1) return res.status(403).json({ message: "此為預設帳號不可刪除" });
            // await account.destroy() //2023.02.09 Liang 刪除帳號時不直接刪掉資料庫，而是改寫下行修改帳戶狀態。
            account.status = false;
            return res.status(200).json({ message: "刪除成功" });

        } catch (err) {
            //資料庫操作錯誤將回傳500及錯誤訊息
            res.status(500).json({ message: "remove product faild" })
        }
    });


    //編輯帳號狀況
    router.post("/status", verifyToken("is_account_editable"), async (req, res) => {
        const accountId = req.body.id;
        const status = req.body.status
        try {
            await database.sync()
            const account = await Account.findOne({
                where: { account_id: accountId }
            })
            if (account == null) { return res.status(404).json({ message: "無此用戶" }) }
            await account.update({ status: status })
            return res.status(200).json({ message: "更改狀況成功" });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "更改失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });


    //更新帳號
    router.post("/update", verifyToken("is_account_editable"), async (req, res) => {
        const { accountId, roleId, accountName, fuji_person_id } = req.body

        try {
            await database.sync()
            const account = await Account.findOne({
                where: {
                    account_id: accountId,
                }
            })
            if (!account) {
                return res.status(404).json({ message: "無此用戶" });
            }
            await account.update({
                role_id: roleId,
                account_name: accountName,
                fuji_person_id
            })
            return res.status(200).json({ message: "更改人員成功" });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "更改失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });


    // 發送重設密碼驗證信
    router.post("/sendemail", async (req, res) => {
        const email = req.body.email;
        try {
            database.sync().then(() => {
                Account.findOne({
                    where: {
                        email: email
                    },
                }).then(account => {
                    if (account) {
                        sendPasswordEmail(email);
                        return res.status(200).json({ message: "寄信成功" });
                    }
                    if (!account) {
                        return res.status(404).json({ message: "無此信箱" });
                    }
                });
            });

        } catch (err) {
            // 如果資料庫出現錯誤時回報 status:500 並回傳錯誤訊息
            res.status(500).json({ message: err.message });
        }
    });

    // 解析token
    async function checkToken(req, res, next) {
        try {
            const decoded = jwt.verify(req.params.create_token, process.env.JWT_SECRET_KEY);
            res.decoded = decoded
        } catch (err) {
            return res.status(500).json({ message: err.message })
        } finally {
            next();
        }
    }


    app.use("/api/account", router);
};
