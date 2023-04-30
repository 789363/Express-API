const Sequelize = require("sequelize");
const sequelize = require("../init/database");
const Form = require("./form");
const Role = require("./role");

const Role_Form = sequelize.define("role_form", {
    role_id: {
        type: Sequelize.INTEGER,
        references: {
            model: Role,
            key: 'role_id'
        }
    },
    is_viewable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    is_editable: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    }
})

module.exports = Role_Form;
