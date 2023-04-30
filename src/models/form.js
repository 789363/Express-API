const Sequelize = require("sequelize");
const sequelize = require("../init/database");
const Account = require("./account");
const Question = require("./question");
const Role_Form = require("./role_form");
const Form = sequelize.define("form",
    {
        form_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        form_name: {
            type: Sequelize.CHAR,
            allowNull: false
        },
        online_status: {
            type: Sequelize.BOOLEAN,
            allowNull: false
        },
        color: {
            type: Sequelize.CHAR,
            allowNull: false
        },
        fillout: {
            type: Sequelize.CHAR,
            allowNull: false
        },
    });

Form.belongsTo(Account, {
    foreignKey: 'create_by'
})
Form.hasMany(Question, { foreignKey: "form_id" })
Question.belongsTo(Form, {
    foreignKey: 'form_id'
})
Form.hasMany(Role_Form, { foreignKey: 'form_id' });

module.exports = Form;
