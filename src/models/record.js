const Sequelize = require("sequelize");
const sequelize = require("../init/database");
const Account = require("./account");
const Question = require("./question");
const Record = sequelize.define("record",
    {
        record_id: {
            type: Sequelize.CHAR,
            primaryKey: true
        },
        reponse: {
            type: Sequelize.CHAR,
            allowNull: false
        },
        seconds: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
    });

Record.belongsTo(Question, {
    foreignKey: 'questions_id'
})
Record.belongsTo(Account, {
    foreignKey: 'account_id'
})
module.exports = Record