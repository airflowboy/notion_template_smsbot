require('dotenv').config(); // .env 파일의 환경변수를 불러옴

const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const { default: CoolsmsMessageService } = require('coolsms-node-sdk');

// 환경변수에서 API 키와 시크릿을 가져옵니다.
const COOLSMS_API_KEY = process.env.COOLSMS_API_KEY; 
const COOLSMS_API_SECRET = process.env.COOLSMS_API_SECRET;
const IMWEB_BIZ_API_KEY = process.env.IMWEB_BIZ_API_KEY;
const IMWEB_BIZ_API_SECRET = process.env.IMWEB_BIZ_API_SECRET;


const messageService = new CoolsmsMessageService(COOLSMS_API_KEY, COOLSMS_API_SECRET);

let orderTime = 1738823596;
let orderList;

// SMS로 링크 전송하는 함수 (CoolSMS 사용)
function sendLinkToPhoneNumber(phoneNumber) {
    const messageObj = {
      to: phoneNumber, // 수신 휴대폰 번호, 나중에 phoneNumber로 변경해야됨.


      from: "01072097050", // 발신 번호 (환경 변수 또는 직접 할당, 예: '01012345678')
      text: `
안녕하세요, 사장님.
만월상회입니다.

만월페이를 구매해 주셔서 진심으로 감사드립니다. 

적립금은 결제 다음 날 자동 지급되며, 금요일에 주문하신 경우 차주 월요일에 지급됩니다.

만약 빠른 적립이 필요하시다면, 언제든지 아래 고객센터 링크로 문의 주시면, 최대한 신속하게 도와드리겠습니다.

감사합니다.

[고객센터]
https://manwolbiz.channel.io/home
      `
    };
  
    // 메시지 전송 (콜백 형식)
    messageService.sendOne(messageObj, (error, result) => {
      if (error) {
        console.error("메시지 전송 중 에러 발생:", error);
      } else {
        console.log("메시지 전송 성공:", result);
      }
    });
  }

async function fetchProductsViaCurl() {
    // imweb API 인증 요청 시 환경변수로부터 key와 secret를 설정합니다.
    const response = await axios.post('https://api.imweb.me/v2/auth', {
        key: IMWEB_BIZ_API_KEY,
        secret: IMWEB_BIZ_API_SECRET
    });

    const data = response.data;
    const accessToken = JSON.stringify(data.access_token);

    let cmd = `curl -X GET -H "Content-Type: application/json" -H "access-token: ${accessToken}" -d '{"version":"latest"}' https://api.imweb.me/v2/shop/orders`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error("curl 명령어 실행 중 에러 발생:", error);
            return;
        }

        try {
            const jsonData = JSON.parse(stdout);
            orderList = jsonData['data']['list'];
           
            // fs.writeFile('manwol_biz_orderList.json', JSON.stringify(orderList, null, 2), (err) => {
            //     if (err) {
            //         console.error("orderList 파일 저장 중 오류 발생:", err);
            //     } else {

            //         console.log("orderList 파일이 성공적으로 저장되었습니다.");
            //     }
            // });
            if(orderTime === jsonData['data']['list'][0]['order_time']) {
                console.log("no recent order");
            }else {
                orderList = jsonData['data']['list'].filter(item => item['order_time'] > orderTime);

                orderList.forEach(item => {
                    const callNumber = item['orderer']['call'];
                    cmd = `curl -X GET -H "Content-Type: application/json" -H "access-token: ${accessToken}" -d '{"version":"latest"}' https://api.imweb.me/v2/shop/orders/${item['order_no']}/prod-orders`;
                    exec(cmd, (error, stdout, stderr) => {
                        if (error) {
                            console.error("curl 명령어 실행 중 에러 발생:", error);
                            return;
                        }
    
                        const jsonData = JSON.parse(stdout);
                        jsonData['data'].forEach(item => {
                            item['items'].forEach(elem => {
                                if (elem['prod_no'] === 236 || elem['prod_no'] === 235 || elem['prod_no'] === 327) {
                                    sendLinkToPhoneNumber(callNumber);
                                } else {
                                    console.log("not 236, 235, 327");

                                }
                            });
                        })
                    });
                });
            }


            orderTime = jsonData['data']['list'][0]['order_time'];
        } catch (parseError) {
            console.error("JSON 파싱 중 에러 발생:", parseError);
        }
    });
}


fetchProductsViaCurl();
setInterval(fetchProductsViaCurl, 1000 * 60 * 1); 