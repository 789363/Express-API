const jwt = require("jsonwebtoken");
const Role = require("../models/role.js");
const database = require("../init/database");

const verifyJWT = async (token, res) => {
  return jwt.verify(token, process.env.JWT_SECRET_KEY);
};

module.exports = (action = "") => {
  return async (req, res, next) => {
    try {
      if (!req.header("Authorization"))return res.status(400).json({message:"No Token"})
      const token = req.header("Authorization");
      const decoded = await verifyJWT(token, res)
      req.decoded = decoded
      await database.sync()
      const role = await Role.findOne({
        where: { role_id: decoded.role_id }
      })

      // 代表只是想要解析token
      if (action === "") return next(); 

      // action請跟role.js的權限名稱一樣
      let conditionVariable = role[action]
      if (!conditionVariable) return res.status(404).json({ message: "權限不足" });
      next();
      return
    } catch (error) {
      return res.status(404).json({ message: `有地方出錯了...${error}` });
    }

  };






};
