import i18n from "i18next";
import { initReactI18next } from "react-i18next";
const keys =
  "explore|subtitle|start|choose|gps|manual|locations|visited|listen|pause|resume|stop|directions|history|feedback|send|dark|light|search|all|nearby|gpsOff|gpsSearching|gpsDenied|gpsPoor|gpsReady|fallback|noVoice|audioError|switch|dismiss|replay|loading|empty|hours|address|speed|progress|rating|comment|thanks|welcome|intro|begin|sound|back|map|offline|continue|seek".split(
    "|",
  );
const rows = {
  vi: "Khám phá|Những câu chuyện trên từng bước chân|Bắt đầu hành trình|Ngôn ngữ thuyết minh|Bật định vị|Chế độ thủ công|Điểm khám phá|Đã ghé thăm|Nghe câu chuyện|Tạm dừng|Tiếp tục|Dừng|Chỉ đường|Câu chuyện phía sau|Chia sẻ cảm nhận|Gửi đánh giá|Giao diện tối|Giao diện sáng|Tìm địa điểm…|Tất cả|Gần bạn|Định vị đang tắt · Bạn vẫn có thể nghe thủ công|Đang tìm vị trí…|Không truy cập được GPS. Bạn có thể chọn điểm để nghe.|GPS sai số trên 50m · Tạm ngừng tự phát|Định vị đang hoạt động|Chưa có bản dịch. Đang dùng tiếng Anh.|Thiết bị chưa có giọng đọc cho ngôn ngữ này. Vui lòng đọc nội dung hoặc chọn ngôn ngữ khác.|Không phát được âm thanh. Bấm nghe để thử lại.|Bạn đang đến gần một địa điểm khác. Chuyển sang|Để sau|Nghe lại|Đang tải…|Chưa có địa điểm phù hợp|Giờ mở cửa|Địa chỉ|Tốc độ|Tiến độ khám phá|Số sao|Cảm nhận của bạn|Cảm ơn bạn đã chia sẻ!|Xin chào, Sài Gòn.|Một thành phố. Muôn câu chuyện. Hãy để Sài Gòn tự kể, bằng ngôn ngữ của bạn.|Khám phá ngay|Âm thanh chỉ được phát sau khi bạn cho phép bắt đầu.|Quay lại|Bản đồ|Đang ngoại tuyến · Hiển thị dữ liệu đã lưu|Tiếp tục khám phá|Vị trí phát",
  en: "Explore|Stories with every step|Start your journey|Narration language|Enable GPS|Manual mode|Places to discover|Visited|Listen to the story|Pause|Resume|Stop|Directions|The story behind|Share your thoughts|Send review|Dark mode|Light mode|Find a place…|All places|Near you|GPS is off · You can still listen manually|Finding your location…|GPS unavailable. Choose a place to listen manually.|Accuracy over 50m · Auto playback paused|GPS is active|Translation unavailable. Playing English.|No voice for this language. Read the story or choose another language.|Audio could not play. Tap listen to try again.|Another place is nearby. Switch to|Later|Listen again|Loading…|No places found|Opening hours|Address|Speed|Your journey|Stars|Your thoughts|Thank you for sharing!|Hello, Saigon.|One city. Countless stories. Let Saigon speak to you, in your language.|Let’s explore|Audio starts only after you choose to begin.|Back|Map|Offline · Showing saved content|Keep exploring|Playback position",
  ko: "둘러보기|걸음마다 만나는 이야기|여행 시작|안내 언어|GPS 켜기|수동 모드|명소|방문 완료|이야기 듣기|일시정지|계속|정지|길찾기|역사 이야기|의견 남기기|평가 보내기|어두운 모드|밝은 모드|명소 검색…|전체|가까운 곳|GPS 꺼짐 · 수동으로 들을 수 있습니다|위치 찾는 중…|GPS를 사용할 수 없습니다. 명소를 직접 선택하세요.|오차 50m 초과 · 자동 재생 중지|GPS 활성화|번역이 없어 영어로 안내합니다.|이 언어의 음성이 없습니다. 내용을 읽거나 다른 언어를 선택하세요.|재생할 수 없습니다. 다시 시도하세요.|다른 명소로 전환할까요?|나중에|다시 듣기|불러오는 중…|명소가 없습니다|운영 시간|주소|속도|여행 진행|별점|의견|감사합니다!|안녕, 사이공.|하나의 도시, 수많은 이야기. 당신의 언어로 사이공을 만나세요.|둘러보기|시작한 후에만 오디오가 재생됩니다.|뒤로|지도|오프라인 · 저장된 콘텐츠|계속 탐험|재생 위치",
  ja: "探索|一歩ごとに出会う物語|旅を始める|案内の言語|GPSを有効に|手動モード|スポット|訪問済み|物語を聴く|一時停止|再開|停止|道案内|歴史と物語|感想を書く|送信|ダークモード|ライトモード|スポットを検索…|すべて|近く|GPSオフ · 手動で聴けます|位置を検索中…|GPSを利用できません。スポットを選んでください。|誤差50m超 · 自動再生停止|GPS有効|翻訳がないため英語で案内します。|この言語の音声がありません。本文を読むか言語を変更してください。|再生できません。もう一度お試しください。|別のスポットに切り替えますか？|後で|もう一度聴く|読み込み中…|スポットがありません|営業時間|住所|速度|旅の進捗|評価|感想|ありがとうございます！|こんにちは、サイゴン。|ひとつの街、数えきれない物語。あなたの言葉で出会うサイゴン。|探索する|開始後にのみ音声が再生されます。|戻る|地図|オフライン · 保存データ|探索を続ける|再生位置",
  zh: "探索|每一步都有故事|开始旅程|讲解语言|开启定位|手动模式|探索景点|已参观|聆听故事|暂停|继续|停止|路线|历史故事|分享感受|提交评价|深色模式|浅色模式|搜索景点…|全部|附近|定位关闭 · 仍可手动收听|正在定位…|无法定位，请手动选择景点。|误差超过50米 · 已暂停自动播放|定位已开启|暂无此翻译，使用英语。|设备没有此语言的语音。请阅读内容或更换语言。|无法播放，请重试。|附近有另一景点，是否切换？|稍后|重新收听|加载中…|没有找到景点|开放时间|地址|语速|探索进度|评分|您的感受|感谢分享！|你好，西贡。|一座城市，无数故事。让西贡用您的语言讲述。|开始探索|开始后才会播放音频。|返回|地图|离线 · 显示已保存内容|继续探索|播放位置",
  th: "สำรวจ|เรื่องราวในทุกย่างก้าว|เริ่มการเดินทาง|ภาษาเสียงบรรยาย|เปิด GPS|โหมดเลือกเอง|สถานที่น่าสนใจ|เยี่ยมชมแล้ว|ฟังเรื่องราว|หยุดชั่วคราว|เล่นต่อ|หยุด|เส้นทาง|เรื่องราวเบื้องหลัง|แบ่งปันความคิดเห็น|ส่งรีวิว|โหมดมืด|โหมดสว่าง|ค้นหาสถานที่…|ทั้งหมด|ใกล้คุณ|ปิด GPS · ยังฟังด้วยตนเองได้|กำลังค้นหาตำแหน่ง…|ใช้ GPS ไม่ได้ โปรดเลือกสถานที่เอง|คลาดเคลื่อนเกิน 50 เมตร · หยุดเล่นอัตโนมัติ|เปิด GPS แล้ว|ไม่มีคำแปล กำลังใช้ภาษาอังกฤษ|ไม่มีเสียงสำหรับภาษานี้ โปรดอ่านข้อความหรือเปลี่ยนภาษา|เล่นเสียงไม่ได้ โปรดลองอีกครั้ง|มีสถานที่อื่นใกล้คุณ ต้องการเปลี่ยนไหม|ภายหลัง|ฟังอีกครั้ง|กำลังโหลด…|ไม่พบสถานที่|เวลาเปิด|ที่อยู่|ความเร็ว|ความคืบหน้า|คะแนน|ความคิดเห็น|ขอบคุณที่แบ่งปัน!|สวัสดี ไซ่ง่อน|หนึ่งเมือง หลากหลายเรื่องราว ให้ไซ่ง่อนเล่าเรื่องในภาษาของคุณ|เริ่มสำรวจ|เสียงจะเล่นหลังจากคุณเริ่มต้นเท่านั้น|กลับ|แผนที่|ออฟไลน์ · แสดงเนื้อหาที่บันทึก|สำรวจต่อ|ตำแหน่งการเล่น",
};
const resources = Object.fromEntries(
  Object.entries(rows).map(([lang, row]) => [
    lang,
    {
      translation: Object.fromEntries(
        row.split("|").map((v, i) => [keys[i], v]),
      ),
    },
  ]),
);
i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("guide-language") || "vi",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
export default i18n;
