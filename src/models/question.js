const Sequelize = require("sequelize");
const sequelize = require("../init/database");
const Option  = require("./option");
const Question = sequelize.define("question", 
{questions_id: {
    type: Sequelize.CHAR,
    primaryKey: true},
questions_name: {
    type: Sequelize.CHAR,
    allowNull: false},
questions_type: {
    type: Sequelize.CHAR,
    allowNull: false},
sequence: {
    type: Sequelize.INTEGER,
    allowNull: false},
});

Question.hasMany(Option, { foreignKey: "questions_id" })

Option.belongsTo(Question, {
    foreignKey: 'questions_id',
})
module.exports = Question;
