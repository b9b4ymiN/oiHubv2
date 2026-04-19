# คู่มือหน้า Options Volume Analysis

- **Route:** `/options-volume`
- **บทบาทของหน้า:** หน้าติดตาม options flow และ volume delta

## เป้าหมายของหน้า
ใช้ดูการไหลของ call/put volume, call-put ratio, smart money flow, volume delta, VWAP ของ strikes, และความสัมพันธ์ระหว่าง options activity กับ OI context

## สารบัญ
- [เป้าหมายของหน้า](#เป้าหมายของหน้า)
- [ใช้เมื่อไร / เหมาะกับใคร](#ใช้เมื่อไร--เหมาะกับใคร)
- [หน้านี้มีอะไรบ้าง](#หน้านี้มีอะไรบ้าง)
- [ปุ่มและการโต้ตอบสำคัญ](#ปุ่มและการโต้ตอบสำคัญ)
- [วิธีใช้งานที่แนะนำ](#วิธีใช้งานที่แนะนำ)
- [มุมมองแบบ OI Trader](#มุมมองแบบ-oi-trader)
- [ข้อควรระวัง](#ข้อควรระวัง)
- [หน้าที่เกี่ยวข้อง](#หน้าที่เกี่ยวข้อง)

## ใช้เมื่อไร / เหมาะกับใคร
เหมาะเมื่อคุณต้องการรู้ว่าตลาด options กำลัง leaning ทางไหน, มี volume shock หรือไม่, และมี smart money participation ที่เปลี่ยน bias ของตลาดหรือเปล่า

## หน้านี้มีอะไรบ้าง
- key metrics: **Total Call Volume**, **Total Put Volume**, **Call/Put Ratio**, **Volume Weighted Average Strike**
- alert cards สำหรับ **High Volume Delta** และ **Smart Money Analysis**
- chart/table sections สำหรับ flow, distribution, และ detailed volume views
- บางส่วนยังขึ้นข้อความว่า component จะพร้อมใช้งานในภายหลัง

## ปุ่มและการโต้ตอบสำคัญ
- **Symbol selector**
- **Interval selector**
- **Timeframe selector**
- ใช้ selectors ทั้งสามร่วมกันเพื่อ align view กับ horizon การเทรดของคุณ

## วิธีใช้งานที่แนะนำ
1. ดู call/put ratio ก่อนเพื่อจับ bias ดิบ
2. ถ้ามี high volume delta ให้ดูว่าเป็น event ชั่วคราวหรือเริ่ม trend ใหม่
3. อ่าน smart money card เพื่อแยก retail noise ออกจาก sustained pressure
4. ใช้ร่วมกับ options-pro เพื่อดูว่า volume flow สอดคล้องกับ dealer positioning หรือไม่

## มุมมองแบบ OI Trader
call-put ratio สูงไม่ได้ bullish เสมอไป; ต้องดูด้วยว่า volume ไปกระจุกที่ strikes ไหน, expiry ไหน, และสัมพันธ์กับ futures OI อย่างไร หน้านี้จึงเหมาะเป็น confirmation layer มากกว่า standalone trigger

## ข้อควรระวัง
- อย่าตีความ metric เดียวเกินจริง โดยเฉพาะ ratio ในวันที่ volume บาง
- มี placeholder บางส่วนใน UI ดังนั้นให้โฟกัสส่วนที่มี data จริงก่อน
- volume shock ควรเทียบกับ context ของ timeframe ที่เลือกเสมอ

## หน้าที่เกี่ยวข้อง
- [`/options-pro`](../options-pro/README.md)
- [`/learn`](../learn/README.md)
