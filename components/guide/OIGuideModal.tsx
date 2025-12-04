export function OIGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-2xl max-h-[90vh] overflow-auto bg-white/95 dark:bg-slate-900/95 border border-gray-200 dark:border-gray-800 rounded-t-xl sm:rounded-lg shadow-2xl p-4 sm:p-6 glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-purple-700 dark:text-purple-300">คู่มือเทรด OI ทำกำไรง่ายๆ</h3>
            <p className="text-xs text-muted-foreground">อ่านทีเดียว เทรดทันที ตัดสินใจได้ใน 30 วินาที</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              📖 <a href="https://github.com/b9b4ymiN/oiHubv2/blob/main/docs/OI-MOMENTUM-GUIDE.md" target="_blank" rel="noopener" className="underline hover:text-blue-800">Complete English Guide</a> • <a href="https://github.com/b9b4ymiN/oiHubv2/blob/main/docs/OI-MOMENTUM-CHEATSHEET.md" target="_blank" rel="noopener" className="underline hover:text-blue-800">Cheat Sheet</a>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded shadow-sm hover:bg-gray-200 transition"
            >
              ปิด
            </button>
          </div>
        </div>

        <div className="space-y-4 text-sm text-gray-800 dark:text-gray-200">
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 rounded">
            <strong className="text-sm text-green-800 dark:text-green-200">🚀 สัญญาณซื้อขายทันที (ปุ่มเร่งด่วน)</strong>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-emerald-500 inline-block"/> 
                <span className="font-semibold">ไฟเขียว = เปิด Long ทันที</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-amber-500 inline-block"/> 
                <span className="font-semibold">ไฟเหลือง = ปิดสถานี รอจังหวะใหม่</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-sky-500 inline-block"/> 
                <span className="font-semibold">ไฟฟ้า = ห้ามเทรด นั่งดู</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3 rounded">
            <strong className="text-sm text-blue-800 dark:text-blue-200">💰 จัดการเงินให้ปลอดภัย</strong>
            <div className="mt-2 text-xs space-y-1">
              <div>🟢 <strong>ไฟเขียวแรงๆ</strong> → เปิด 1R (ทุนเต็ม)</div>
              <div>🟡 <strong>ไฟเหลือง</strong> → 0.5R (ครึ่งทุน) หรือปิดทั้งหมด</div>
              <div>🔵 <strong>ไฟฟ้า</strong> → 0R (ห้ามเข้า) ถ้ามีสถานีให้ปิดทันที</div>
            </div>
          </div>

          <div className="p-3 border rounded bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-800">
            <strong className="text-sm">📊 อ่านกราฟง่ายๆ 3 ขั้นตอน</strong>
            <ol className="mt-2 text-xs space-y-2">
              <li><strong>1. ดูสีปัจจุบัน</strong> - อยู่บรรทัดล่างสุด</li>
              <li><strong>2. ดูแรงเทรนด์</strong> - Trend Ratio {">"} 60% = แน่นอน</li>
              <li><strong>3. ดูไทม์ไลน์</strong> - สีเดียวกันต่อเนื่อง = แรงจริง</li>
            </ol>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-3 rounded">
            <strong className="text-sm text-yellow-800 dark:text-yellow-200">⚡ เทคนิคเทรดเด็ด</strong>
            <div className="mt-2 text-xs space-y-2">
              <div>🔥 <strong>จังหวะเด็ดที่สุด</strong>: ไฟเขียว + Trend Ratio {">"} 70% + Rocket ปรากฏ</div>
              <div>⚠️ <strong>อันตราย</strong>: ไฟเหลือง 3 ครั้งติด = ตลาดกำลังจะลง</div>
              <div>🎯 <strong>จุดเข้าออก</strong>: ดูการเปลี่ยนสีจากฟ้า→เขียว = จุดเข้าทอดถอน</div>
            </div>
          </div>

          <div className="p-3 border rounded bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-800">
            <strong className="text-sm">🧠 สูตรคำนวณความแม่นยำ</strong>
            <div className="mt-2 text-xs space-y-1">
              <div>✅ <strong>เทรดได้</strong>: ตรงกัน 4-5 ข้อ</div>
              <div>⚠️ <strong>ระวัง</strong>: ตรงกัน 2-3 ข้อ</div>
              <div>❌ <strong>ห้ามเข้า</strong>: ตรงกัน 0-1 ข้อ</div>
            </div>
            
            <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs">
              <strong>เช็คลิสต์ก่อนเปิดออเดอร์:</strong>
              <ul className="mt-1 space-y-1">
                <li>□ สีปัจจุบันเป็นอะไร?</li>
                <li>□ Trend Ratio เกิน 60% ไหม?</li>
                <li>□ ไทม์ไลน์สีเดียวกันต่อเนื่องไหม?</li>
                <li>□ Position Size เหมาะสมไหม?</li>
                <li>□ มี Rocket หรือสัญญานพิเศษไหม?</li>
              </ul>
            </div>
          </div>

          <div className="p-3 border rounded bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-800">
            <strong className="text-sm">🎖️ กฎเหล็ก OI Trader</strong>
            <ul className="mt-2 text-xs space-y-1">
              <li>• <strong>ไฟเขียว</strong> = เทรนด์ขึ้นจริง • <strong>ซื้อ</strong> แล้วรอกำไร</li>
              <li>• <strong>ไฟเหลือง</strong> = Smart Money กำลังขาย • <strong>ปิดสถานี</strong> หรือ Short</li>
              <li>• <strong>ไฟฟ้า</strong> = ตลาดไม่มีทิศทาง • <strong>นั่งดู</strong> อย่าเสี่ยง</li>
            </ul>
          </div>

          <div className="pt-2 border-t mt-2 text-sm">
            <strong className="block text-red-600 dark:text-red-400">⚠️ ข้อความเตือนสำคัญ</strong>
            <p className="mt-2 text-xs text-muted-foreground">
              ระบบนี้ช่วยตัดสินใจได้เร็วขึ้น แต่ไม่รับประกับผลกำไร 100% 
              ควรใช้ร่วมกับการวิเคราะห์ตัวเองและจัดการความเสี่ยงให้ดี
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
