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
            <h3 className="text-lg sm:text-xl font-semibold text-purple-700 dark:text-purple-300">OI Momentum &amp; Acceleration — Quick Guide</h3>
            <p className="text-xs text-muted-foreground">วิธีอ่านแรงตลาดแบบเร็วที่สุดใน 10 วินาที</p>
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
          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 p-3 rounded">
            <strong className="text-sm text-purple-800 dark:text-purple-200">🔹 1) Current Signal</strong>
            <p className="mt-1 text-xs text-muted-foreground">ตลาดอยู่โหมดไหน — ไฟเขียว / ไฟเหลือง / ไฟแดง</p>
            <ul className="mt-2 space-y-1">
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"/> <strong>TREND CONTINUATION</strong> — เทรนด์กำลังไปต่อ</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-500 inline-block"/> <strong>DISTRIBUTION</strong> — Smart Money อาจกำลังออกของ</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-sky-500 inline-block"/> <strong>NEUTRAL</strong> — ไม่มีแรงชัดเจน (หลีกเลี่ยงเทรด)</li>
            </ul>
          </div>

          <div className="p-3 border rounded bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-800">
            <strong className="text-sm">🔹 2) Trading Action</strong>
            <p className="mt-1 text-xs text-muted-foreground">สรุปการตัดสินใจทันที: เพิ่ม / ลด / งด Position • รอคอนเฟิร์ม หรือ เข้าเลย • ตลาดเหมาะกับกลยุทธ์แบบไหน</p>
          </div>

          <div className="p-3 border rounded bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-800">
            <strong className="text-sm">🔹 3) Position Size</strong>
            <p className="mt-1 text-xs text-muted-foreground">คำแนะนำไซส์โดยย่อ (ช่วยคุมความเสี่ยง)</p>
            <ul className="mt-2 space-y-1">
              <li><strong>1.0R</strong> — เทรนด์แข็งแรง</li>
              <li><strong>0.7R</strong> — ตลาดมีความเสี่ยงระดับกลาง</li>
              <li><strong>0.3R</strong> — ตลาดแผ่ว / ไม่น่าเล่น</li>
              <li><strong>0.0R</strong> — ห้ามเข้า</li>
            </ul>
          </div>

          <div className="p-3 border rounded bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-800">
            <strong className="text-sm">🔹 4) Summary — Last 30 Bars</strong>
            <p className="mt-1 text-xs text-muted-foreground">ดู 3 ค่า: Trend (OI เพิ่ม), Dist (OI ลด), Neutral. Trend Ratio (%) เป็นตัวชี้วัด</p>
            <div className="mt-2 text-xs">
              <div>&gt;60% = เทรนด์จริง</div>
              <div>40–60% = Mixed</div>
              <div>&lt;40% = Distribution</div>
            </div>
          </div>

          <div className="p-3 border rounded bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-800">
            <strong className="text-sm">🔹 5) Momentum / Accel</strong>
            <p className="mt-1 text-xs text-muted-foreground">ตีความสั้น ๆ</p>
            <table className="w-full text-xs mt-2 table-fixed">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="w-1/3">Momentum</th>
                  <th className="w-1/3">Accel</th>
                  <th>ความหมาย</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>+</td>
                  <td>+</td>
                  <td>เทรนด์กำลังเร่ง</td>
                </tr>
                <tr>
                  <td>+</td>
                  <td>-</td>
                  <td>แรงเริ่มชะลอ</td>
                </tr>
                <tr>
                  <td>-</td>
                  <td>-</td>
                  <td>Smart Money กำลังออกของ</td>
                </tr>
                <tr>
                  <td>-</td>
                  <td>+</td>
                  <td>มีโอกาสเด้งสั้น</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 border rounded bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-800">
            <strong className="text-sm">🔹 6) Signal Timeline</strong>
            <p className="mt-1 text-xs text-muted-foreground">สีและไอคอนช่วยให้เห็นว่าใครคุมตลาด</p>
            <div className="mt-2 text-xs space-y-1">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"/> <strong>เขียว</strong> = Trend</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-800 inline-block"/> <strong>น้ำตาล</strong> = Distribution</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-sky-500 inline-block"/> <strong>ฟ้า</strong> = Neutral</div>
              <div className="mt-2">🚀 <strong>Rocket</strong> = จุดแรงสุดของตลาด</div>
            </div>
          </div>

          <div className="pt-2 border-t mt-2 text-sm">
            <strong className="block">Workflow แนะนำ (สั้น)</strong>
            <ol className="mt-2 text-xs space-y-1">
              <li>1) ดู Current Signal</li>
              <li>2) อ่าน Trading Action</li>
              <li>3) ดู Position Size</li>
              <li>4) เช็ก Summary (30 Bars)</li>
              <li>5) ดู Timeline ประกอบ</li>
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">ตรงกัน ≥ 4 ข้อ = จังหวะดี • ตรงกัน ≤ 2 ข้อ = ไม่ควรเทรด</p>
          </div>
        </div>
      </div>
    </div>
  );
}
