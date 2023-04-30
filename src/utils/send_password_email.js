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

module.exports = async function sendPasswordEmail(email) {
    return new Promise((resolve, reject) => {
        const createToken = jwt.sign({email: email}, process.env.JWT_SECRET_KEY);
        const options = {
            // 寄件者
            from: process.env.MAIL_USER,
            // 收件者
            to: email,
            // 主旨
            subject: "請點選連結來重新設定密碼", // Subject line
            // 嵌入 html 的內文
            html: `<h2>親愛的會員您好：<br /><br/>請點擊下方連結重新設定密碼<br /><a href="${process.env.FRONT_URL}/resetpassword/${createToken}">請點這裡</a><br />不是您本人嗎?請直接忽略或刪除此信件，謝謝！<br /></h2>`,
        };

        // 發送郵件
        transporter.sendMail(options, function(error, info) {
            if (error) {
                console.info(error,
               );
                reject({status:400, msg:error});
            } else {
                console.info("訊息發送: " + info.response);
                resolve({status: 200, msg: "Succeed send email"});
            }
        });
    });
};
