const fetch = require("node-fetch");

module.exports = async (GroupId, UserId, PW, OrgId, PersonId) => {
    const date = new Date();
    const mm = date.getMonth() + 1; // getMonth() 從0開始
    const dd = date.getDate();
    const taiwanDate = [date.getFullYear(), (mm>9 ? '' : '0') + mm , (dd>9 ? '' : '0') + dd].join('')

    try {
        const fetchUrl = `http://59.120.244.37:55565/api/WebSrv/GetHRClassSet?GroupId=${GroupId}&UserId=${UserId}&PW=${PW}&OrgId=${OrgId}&PersonId=${PersonId}&StartDate=${taiwanDate}&EndDate=${taiwanDate}`
        const res = await fetch(fetchUrl, {
            method: "GET",
            headers: {
                "Content-type": "application/json"
            }
        })
        const data = await res.json()
        const jsonString = JSON.parse(data[2])
        const hrmClassRpt = jsonString.WSSetTW?.hrmClassRpt
        const employeeStatusCode = hrmClassRpt['RPT_5_A.PersonId>A.ServiceStatus_0']

        const deptId = hrmClassRpt['DeptId']

        if (employeeStatusCode === "0002" || employeeStatusCode === "0001") return [deptId, true]
        return [deptId, false]
    } catch (error) {
        return ["error", false]
    }
}
