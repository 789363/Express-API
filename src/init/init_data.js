const Role = require("../models/role");
const Account = require("../models/account");
const { Op } = require("sequelize");

module.exports = async (ctx) => {
    const database = ctx.sequelize;
    await initRole(database);
    await initAccount(database);
}

async function initAccount(database) {
    try {
        await database.sync()
        const account = await Account.findOne({
            where: {
                account_id: 1
            }
        })
        if (account === null) {
            await Account.create({
                account_id: 1,
                account_name: 'fuji-admin',
                fuji_person_id: "50206",
                fuji_dept_id: "5B29",
                status: true,
                password: 'fuji852963741',
                email: 'test@gmail.com',
                role_id: 1
            })
        }
    } catch (err) {
        console.log('catch', err);
    }
}

async function initRole(database) {
    try {
        await database.sync()
        const role = await Role.count({
            where: {
                [Op.or]: [{ role_id: 1 }, { role_id: 2 }, { role_id: 3 }]
            }
        })
        if (role !== 3) {
            await Role.destroy({
                where: {
                    [Op.or]: [{ role_id: 1 }, { role_id: 2 }, { role_id: 3 }]
                }
            })
            await Role.bulkCreate([{
                role_id: 1,
                role_name: "fuji-admin",
                is_form_addable: true,
                is_result_visable: true,
                is_role_visable: true,
                is_role_editable: true,
                is_role_deletable: true,
                is_account_visable: true,
                is_account_editable: true,
                is_account_deletable: true,
                is_excel_exportable: true,
                is_form_deletable: true
            },
            {
                role_id: 2,
                role_name: "fuji-manager",
                is_form_addable: false,
                is_result_visable: true,
                is_role_visable: false,
                is_role_editable: false,
                is_role_deletable: false,
                is_account_visable: false,
                is_account_editable: false,
                is_account_deletable: false,
                is_excel_exportable: false,
                is_form_deletable: false
            },
            {
                role_id: 3,
                role_name: "fuji-employee",
                is_form_addable: false,
                is_result_visable: false,
                is_role_visable: false,
                is_role_editable: false,
                is_role_deletable: false,
                is_account_visable: false,
                is_account_editable: false,
                is_account_deletable: false,
                is_excel_exportable: false,
                is_form_deletable: false
            }])
        }

    } catch (err) {
        console.log('catch', err);
    }
}