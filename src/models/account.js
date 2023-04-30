const Sequelize = require("sequelize");
const sequelize = require("../init/database");
const Role = require("./role")
const Account = sequelize.define("account", {
    account_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fuji_person_id: {
        type: Sequelize.CHAR,
        allowNull: false
    },
    fuji_dept_id: {
        type: Sequelize.CHAR,
        allowNull: false
    },
    account_name: {
        type: Sequelize.CHAR,
        allowNull: false
    },
    status: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    password: {
        type: Sequelize.CHAR,
        allowNull: false
    },
    email: {
        type: Sequelize.CHAR,
        unique: true,
        allowNull: false
    },
});


Account.belongsTo(Role,{
    foreignKey: 'role_id'
})



module.exports = Account;

// Project 有一個 memberId 欄位，放 member 的 id
// target = member
// Member.hasOne(Project)  // 擁有

// Member 有一個 projectId 欄位，放 project 的 id
// target = project
// Member.belongsTo(Project) // 屬於