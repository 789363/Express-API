const { Router: expressRouter } = require("express");
const Role = require("../models/role");
const verifyToken = require("../middleware/verify_token");
const { Op, where } = require("sequelize");
// Export routes mapper (function)
module.exports = (ctx, app) => {
    const router = expressRouter();
    const database = ctx.sequelize;

    //取得所有角色
    router.get("/getall", verifyToken("is_role_visable"), async (req, res) => {
        try {
            await database.sync();
            const role = await Role.findAll()
            return res.status(200).json(role)
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })
    // 顯示角色頁
    router.get("/rolepage/:page/:name?", verifyToken("is_role_visable"), async (req, res) => {
        const page = req.params.page
        const name = req.params.name ?? ""
        try {
            await database.sync()
            const role = await Role.findAll({
                where: {
                    role_name: {
                        [Op.like]: `%${name}%`
                    }
                },
                offset: (page - 1) * 20, limit: page * 20
            })
            return res.status(200).json( role )
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    })
    //取得最新角色ID
    router.post("/getroleid", verifyToken("is_role_editable"), async (req, res) => {
        try {
            await database.sync()
            const role = await Role.findOne({ order: [["role_id", "DESC"]] }
            )
            res.status(200).json({ id: parseInt(role.role_id) + 1 });
        } catch (err) {
            //如果資料庫出現錯誤時回報 status:500 並回傳錯誤訊息 
            res.status(500).json({ message: err.message })
        }
    });

    //角色狀態更新
    router.post("/update", verifyToken("is_role_editable"), async (req, res) => {
        const roleId = req.body.id;
        const status = req.body.status;
        const type = req.body.type;
        try {
            await database.sync()
            const role = await Role.findOne({
                where: {
                    role_id: roleId,
                }
            })
            if (role == null) {
                return res.status(404).json({ message: "無此角色" });
            }
            if (type !== "is_form_addable" &&
                type !== "is_result_visable" &&
                type !== "is_role_visable" &&
                type !== "is_role_editable" &&
                type !== "is_role_deletable" &&
                type !== "is_account_visable" &&
                type !== "is_account_editable" &&
                type !== "is_account_deletable" &&
                type !== "is_excel_exportable" &&
                type !== "is_form_deletable"
                ) return res.status(404).json({ message: "無此狀態" });
            await role.update({
                [type]: status
            })
            return res.status(200).json({ message: "更改狀況成功" });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "更改失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });

    //找出特定角色
    router.get("/get/:role_id", verifyToken("is_role_editable"), async (req, res) => {
        const roleId = req.params.role_id;
        try {
            await database.sync()
            const role = await Role.findOne({
                where: {
                    role_id: roleId,
                }
            })
            if (role == null) {
                return res.status(404).json({ message: "Can't find role" })
            }
            return res.status(200).json({ role });

        } catch (err) {
            // 如果資料庫出現錯誤時回報 status:500 並回傳錯誤訊息
            res.status(500).json({ message: err.message });
        }

    });


    //角色更新
    router.post("/updatename", verifyToken("is_role_editable"), async (req, res) => {
        const roleId = req.body.role_id;
        const roleName = req.body.role_name;
        try {
            await database.sync()
            const role = await Role.findOne({
                where: {
                    role_id: roleId,
                }
            })
            if (role == null) {
                return res.status(404).json({ message: "無此角色" });
            }
            await role.update({
                role_name: roleName
            })
            return res.status(200).json({ message: "更改狀況成功" });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "更改失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });

    //新增角色
    router.post("/create", verifyToken("is_role_editable"), async (req, res) => {
        try {
            const roleName = req.body.name;
    
            const { is_form_addable , is_result_visable , is_role_visable , is_role_editable ,
                is_role_deletable , is_account_visable , is_account_editable ,
                is_account_deletable , is_excel_exportable, is_form_deletable } = req.body;
            await database.sync()
            await Role.create({
                role_name: roleName,
                is_form_addable,
                is_result_visable,
                is_role_visable,
                is_role_editable,
                is_role_deletable,
                is_account_visable,
                is_account_editable,
                is_account_deletable,
                is_excel_exportable,
                is_form_deletable
            })
            return res.status(200).json({ message: "新增角色成功" });
        } catch (err) {
            // 資料庫更新錯誤回傳400及錯誤訊息
            res.status(400).json({ message: "新增失敗，請重新再試一次", error: err }); // 更新失敗
        }
    });

    //刪除角色
    router.delete("/delete", verifyToken("is_role_deletable"), async (req, res) => {
        try {
            await database.sync()
            const role = await Role.findOne({
                where: {
                    role_id: req.body.id
                }
            })
            if (role == null) {
                return res.status(404).json({ message: "無此用戶" });
            }
            if (role.role_id === 1 | role.role_id === 2) return res.status(403).json({ message: "此為預設角色不可刪除" });
            await role.destroy()
            return res.status(200).json({ message: "刪除成功" });

        } catch (err) {
            //資料庫操作錯誤將回傳500及錯誤訊息
            res.status(500).json({ message: "remove product faild" })
        }
    });
    app.use("/api/role", router);


};
