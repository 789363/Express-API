const { where } = require("sequelize");
const Sequelize = require("sequelize");
const sequelize = require("../init/database");
const Role = sequelize.define("role", {
    role_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    role_name: {
        type: Sequelize.CHAR,
        allowNull: false
    },
    is_form_addable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    is_result_visable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    is_role_visable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    is_role_editable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    is_role_deletable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    is_account_visable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    is_account_editable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    is_account_deletable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    is_excel_exportable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    is_form_deletable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
});


module.exports = Role;
