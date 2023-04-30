const Sequelize = require("sequelize");
const sequelize = require("../init/database");
const Question = require("./question");
const Option = sequelize.define("option",
    {
        option_id: {
            type: Sequelize.CHAR,
            primaryKey: true
        },
        option_title: {
            type: Sequelize.CHAR,
            allowNull: false
        },
        sequence: {
            type: Sequelize.INTEGER,
            allowNull: false
        },

    });

module.exports = Option;
