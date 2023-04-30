const verify_fuji_employee = require("../utils/verify_fuji_employee");

module.exports = (isCallFromSignUp = true) => {
    return async (req, res, next) => {
        try {
            let fuji_person_id

            if (isCallFromSignUp) {
                ({ fuji_person_id } = req.body);
            }
            if (!isCallFromSignUp) {
                ({ fuji_person_id } = res.locals.fujiData);
            }

            if (!fuji_person_id) return res.status(422).json({ message: "欄位沒有輸入完全" })
            const [deptId, isEmployeeStillWorking] = await verify_fuji_employee("CTERP", "FUJIQNRSYSTEM", "000000", "1000", fuji_person_id)
            res.locals.deptId = deptId
            if (!isEmployeeStillWorking) return res.status(401).json({ message: "該員工不在職!" })
            next()
            return
        } catch (error) {
            return res.status(500).json({ message: `有錯誤發生了,${error}` })
        }
    }
}