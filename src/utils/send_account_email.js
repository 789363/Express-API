const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_SECRET_KEY,
    },
});

module.exports = async function sendAccountEmail(information) {
    return new Promise((resolve, reject) => {

        try {
            const info = {
                email: information.email,
                password: information.password,
                account_name: information.account_name,
                fuji_person_id: information.fuji_person_id,
                fuji_dept_id: information.fuji_dept_id,
            }

            const createToken = jwt.sign(info, process.env.JWT_SECRET_KEY);
            const options = {
                // 寄件者
                from: process.env.MAIL_USER,
                // 收件者
                to: information.email,
                // 主旨
                subject: "請點選連結來驗證帳號", // Subject line
                // 嵌入 html 的內文
                html: `<h2>親愛的` + information.account_name + `您好：<br />此為您驗證會員之信件<br/>請點擊下方連結完成電子信箱<br /><a href="${process.env.BASE_URL}/account/verify/${createToken}">請點這裡</a><br />不是您本人嗎?請直接忽略或刪除此信件，謝謝！<br /></h2>`,
            };

            // 發送郵件
            transporter.sendMail(options, function (error, info) {
                if (error) {
                    console.info(error);
                    reject({ status: 400, msg: error });
                } else {
                    console.info("訊息發送: " + info.response);
                    resolve({ status: 200, msg: "Succeed send email" });
                }
            })
        } catch (err) {
            reject({ status: 400, msg: "send email failed" });
        }
    });
};
