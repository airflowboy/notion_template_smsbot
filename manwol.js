require('dotenv').config(); // .env 파일의 환경변수를 불러옴

const { exec } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const { default: CoolsmsMessageService } = require('coolsms-node-sdk');

// 환경변수에서 API 키와 시크릿을 가져옵니다.
const COOLSMS_API_KEY = process.env.COOLSMS_API_KEY; 
const COOLSMS_API_SECRET = process.env.COOLSMS_API_SECRET;
const IMWEB_MANWOL_API_KEY = process.env.IMWEB_MANWOL_API_KEY;
const IMWEB_MANWOL_API_SECRET = process.env.IMWEB_MANWOL_API_SECRET;


const messageService = new CoolsmsMessageService(COOLSMS_API_KEY, COOLSMS_API_SECRET);

let orderTime = 1738737098;
let orderList;

// SMS로 링크 전송하는 함수 (CoolSMS 사용)
function sendLinkToPhoneNumber(phoneNumber) {
    const messageObj = {
      to: phoneNumber, // 수신 휴대폰 번호, 나중에 phoneNumber로 변경해야됨.
      from: process.env.PHONE_NUMBER, // 발신 번호 (환경 변수 또는 직접 할당, 예: '01012345678')
      text: `

        안녕하세요 보름달이 뜨는 날, 천재들의 모임 만월회입니다.

여러분의 영감을 담을 수 있는 노션 템플릿을 준비했어요.
(템플릿 링크)
https://creator-guide.notion.site/190c687af8af8006a19afd7082c91b41

(사용방법)
1. 링크를 클릭해 노션 템플릿을 확인하세요.
2. 오른쪽 상단에 있는 '선 3개'를 누르고 복제를 클릭하세요.
3. 복제된 페이지를 개인 노션에서 자유롭게 활용하시면 됩니다!

awake 달력과 함께, 한 해동안 멋진 영감이 가득하길 바랍니다.
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
        key: IMWEB_MANWOL_API_KEY,
        secret: IMWEB_MANWOL_API_SECRET
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
            
            // orderList를 JSON 파일로 저장합니다.
            // fs.writeFile('manwol_orderList.json', JSON.stringify(orderList, null, 2), (err) => {
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
                    cmd = `curl -X GET -H "Content-Type: application/json" -H "access-token: ${accessToken}" -d '{"version":"latest"}' https://api.imweb.me/v2/shop/orders/${item['order_no']}/prod-orders`;
                    exec(cmd, (error, stdout, stderr) => {
                        if (error) {
                            console.error("curl 명령어 실행 중 에러 발생:", error);
                            return;
                        }
    
                        const jsonData = JSON.parse(stdout);
                        jsonData['data'].forEach(item => {
                            item['items'].forEach(elem => {
                                if (elem['prod_no'] === 280) {
                                    sendLinkToPhoneNumber(item['prod_order_delivery']['address']['phone']);
                                } else {
                                    console.log("not 280");
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